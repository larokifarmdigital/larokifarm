// Implementación real de FarmaciaRepository contra Neon via Prisma.
// Multi-tenant: filtra por `businessId` del usuario en sesión salvo
// SUPER_ADMIN (pool mode — ve todos los negocios).
//
// Children (servicios/features/faqs) usan estrategia replace-all:
// cuando el patch incluye una lista, se borran todas las filas del negocio
// y se recrean. Es seguro porque el editor manda siempre la lista completa
// (no diffs). Simple, correcto y transaccional.

import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/lib/prisma';
import { READ_ONLY_ERROR, canEditContent, getCurrentUser } from '@/core/auth';
import type {
  Farmacia,
  FarmaciaRepository,
  FarmaciaSummary,
} from '@/core/farmacias/domain';
import type { SaveResult } from '@/core/shared';
import {
  asStatus,
  mapBusinessToFarmacia,
  splitFarmaciaPatch,
  type BusinessWithContent,
} from './mappers';

class SaveConflictError extends Error {}

// ───────────────────────────────────────────────────────────────────
// Guards de tenant
// ───────────────────────────────────────────────────────────────────

/** Si el usuario NO es SUPER_ADMIN, devuelve su businessId obligatorio.
 *  Si es SUPER_ADMIN, devuelve `null` (ver todos). */
async function tenantFilter(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Sesión requerida');
  if (user.rol === 'admin') return null; // SUPER_ADMIN pool mode
  if (!user.farmaciaId) throw new Error('Usuario sin negocio asignado');
  return user.farmaciaId;
}

async function ensureCanAccessBusiness(id: string): Promise<void> {
  const filter = await tenantFilter();
  if (filter !== null && filter !== id) {
    throw new Error('Acceso denegado al negocio');
  }
}

/** Acceso al negocio + rol con permiso de escritura (USER = solo lectura). */
async function ensureCanWriteBusiness(id: string): Promise<void> {
  await ensureCanAccessBusiness(id);
  const user = await getCurrentUser();
  if (!user || !canEditContent(user)) throw new Error(READ_ONLY_ERROR);
}

// ───────────────────────────────────────────────────────────────────
// Includes compartidos
// ───────────────────────────────────────────────────────────────────

const CONTENT_INCLUDE = {
  servicios: true,
  features: true,
  faqs: true,
  resenas: true,
  imagenes: true,
} as const;

// ───────────────────────────────────────────────────────────────────
// Repo
// ───────────────────────────────────────────────────────────────────

export const farmaciaRepositoryPrisma: FarmaciaRepository = {
  async listFarmacias(): Promise<FarmaciaSummary[]> {
    const filter = await tenantFilter();
    const rows = await prisma.business.findMany({
      where: filter ? { id: filter } : undefined,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        slug: true,
        name: true,
        ciudad: true,
        publishedStatus: true,
        idiomasActivos: true,
        updatedAt: true,
        logoUrl: true,
        imagenes: {
          where: { role: 'logo' },
          orderBy: { orden: 'asc' },
          take: 1,
          select: { id: true, publicUrl: true, alt: true, width: true, height: true, sizeBytes: true },
        },
      },
    });

    return rows.map((r) => {
      const logoImg = r.imagenes[0];
      return {
        id: r.id,
        slug: r.slug,
        nombre: r.name,
        ciudad: r.ciudad ?? undefined,
        status: asStatus(r.publishedStatus),
        idiomasActivos: Array.isArray(r.idiomasActivos)
          ? (r.idiomasActivos as unknown as Farmacia['idiomasActivos'])
          : ['es'],
        updatedAt: r.updatedAt.toISOString(),
        logo: logoImg
          ? {
              id: logoImg.id,
              url: logoImg.publicUrl,
              alt: (logoImg.alt as Record<string, string>) ?? {},
              ancho: logoImg.width ?? undefined,
              alto: logoImg.height ?? undefined,
              peso: logoImg.sizeBytes ?? undefined,
            }
          : r.logoUrl
            ? { id: 'legacy-logo', url: r.logoUrl, alt: {} }
            : undefined,
      };
    });
  },

  async getFarmacia(id): Promise<Farmacia | null> {
    const filter = await tenantFilter();
    const row = await prisma.business.findUnique({
      where: { id },
      include: CONTENT_INCLUDE,
    });
    if (!row) return null;
    if (filter !== null && filter !== row.id) return null;
    return mapBusinessToFarmacia(row as BusinessWithContent);
  },

  async getFarmaciaBySlug(slug): Promise<Farmacia | null> {
    const filter = await tenantFilter();
    const row = await prisma.business.findUnique({
      where: { slug },
      include: CONTENT_INCLUDE,
    });
    if (!row) return null;
    if (filter !== null && filter !== row.id) return null;
    return mapBusinessToFarmacia(row as BusinessWithContent);
  },

  async getPublishedFarmaciaBySlug(slug): Promise<Farmacia | null> {
    const row = await prisma.business.findFirst({
      where: { slug, publishedStatus: 'published' },
      include: CONTENT_INCLUDE,
    });
    return row ? mapBusinessToFarmacia(row as BusinessWithContent) : null;
  },

  async saveFarmacia(id, patch, opts): Promise<SaveResult<Farmacia>> {
    try {
      await ensureCanWriteBusiness(id);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Acceso denegado' };
    }

    // Conflicto de slug (único)
    if (patch.slug) {
      const existing = await prisma.business.findUnique({ where: { slug: patch.slug }, select: { id: true } });
      if (existing && existing.id !== id) {
        return {
          ok: false,
          error: 'Slug en uso',
          fieldErrors: { slug: `El slug "${patch.slug}" ya está en uso` },
        };
      }
    }

    const { scalar, children } = splitFarmaciaPatch(patch);

    try {
      const row = await prisma.$transaction(async (tx) => {
        // 0) Control optimista: si otra pestaña/persona guardó después de que
        // este editor cargase, no pisamos sus cambios.
        if (opts?.expectedUpdatedAt) {
          const cur = await tx.business.findUnique({ where: { id }, select: { updatedAt: true } });
          if (cur && cur.updatedAt.toISOString() !== opts.expectedUpdatedAt) throw new SaveConflictError();
        }

        // 1) UPDATE escalares + JSON blobs. Siempre se toca `updatedAt` (también
        // si solo cambian servicios/FAQs) para que el control optimista lo vea.
        await tx.business.update({
          where: { id },
          data: { ...(scalar as Prisma.BusinessUpdateInput), updatedAt: new Date() },
        });

        // 2) Children — replace-all por colección incluida en el patch
        if (children.servicios !== undefined) {
          await tx.servicio.deleteMany({ where: { businessId: id } });
          if (children.servicios.length > 0) {
            await tx.servicio.createMany({
              data: children.servicios.map((s, i) => ({
                businessId: id,
                icono: s.icono ?? null,
                nombre: s.nombre as Prisma.InputJsonValue,
                descripcion: s.descripcion ? (s.descripcion as Prisma.InputJsonValue) : Prisma.JsonNull,
                enlace: s.enlace ? (s.enlace as Prisma.InputJsonValue) : Prisma.JsonNull,
                orden: s.orden ?? i,
              })),
            });
          }
        }

        if (children.features !== undefined) {
          await tx.contentFeature.deleteMany({ where: { businessId: id } });
          if (children.features.length > 0) {
            await tx.contentFeature.createMany({
              data: children.features.map((f, i) => ({
                businessId: id,
                icono: f.icono ?? null,
                titulo: f.titulo as Prisma.InputJsonValue,
                descripcion: f.descripcion ? (f.descripcion as Prisma.InputJsonValue) : Prisma.JsonNull,
                orden: f.orden ?? i,
              })),
            });
          }
        }

        if (children.faqs !== undefined) {
          await tx.faq.deleteMany({ where: { businessId: id } });
          if (children.faqs.length > 0) {
            await tx.faq.createMany({
              data: children.faqs.map((f, i) => ({
                businessId: id,
                pregunta: f.pregunta as Prisma.InputJsonValue,
                respuesta: f.respuesta as Prisma.InputJsonValue,
                orden: f.orden ?? i,
              })),
            });
          }
        }

        return tx.business.findUnique({
          where: { id },
          include: CONTENT_INCLUDE,
        });
      });

      if (!row) return { ok: false, error: 'Farmacia no encontrada tras update' };
      return { ok: true, data: mapBusinessToFarmacia(row as BusinessWithContent) };
    } catch (e) {
      if (e instanceof SaveConflictError) {
        return { ok: false, code: 'conflict', error: 'Esta farmacia se ha modificado en otra pestaña o por otra persona.' };
      }
      console.error('[farmacias] saveFarmacia', e);
      return { ok: false, error: 'No se pudo guardar. Revisa los datos y vuelve a intentarlo.' };
    }
  },

  async createFarmacia(input): Promise<SaveResult<Farmacia>> {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: 'Sesión requerida' };
    // Solo SUPER_ADMIN crea negocios (los BUSINESS_ADMIN gestionan el suyo, no crean otros).
    if (user.rol !== 'admin') {
      return { ok: false, error: 'Solo un SUPER_ADMIN puede crear farmacias' };
    }

    const existing = await prisma.business.findUnique({ where: { slug: input.slug }, select: { id: true } });
    if (existing) {
      return {
        ok: false,
        error: 'Slug en uso',
        fieldErrors: { slug: `El slug "${input.slug}" ya está en uso` },
      };
    }

    try {
      const row = await prisma.business.create({
        data: {
          slug: input.slug,
          name: input.nombre,
          ciudad: input.ciudad ?? null,
          publishedStatus: 'draft',
          idiomasActivos: input.idiomasActivos as Prisma.InputJsonValue,
        },
        include: CONTENT_INCLUDE,
      });
      return { ok: true, data: mapBusinessToFarmacia(row as BusinessWithContent) };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Error desconocido al crear' };
    }
  },

  async publishFarmacia(id, status) {
    return this.saveFarmacia(id, { status });
  },

  async archiveFarmacia(id) {
    return this.saveFarmacia(id, { status: 'archived' });
  },

  async duplicateFarmacia(id): Promise<SaveResult<Farmacia>> {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: 'Sesión requerida' };
    if (user.rol !== 'admin') {
      return { ok: false, error: 'Solo un SUPER_ADMIN puede duplicar farmacias' };
    }

    const src = await prisma.business.findUnique({ where: { id }, include: CONTENT_INCLUDE });
    if (!src) return { ok: false, error: 'Farmacia no encontrada' };

    // Buscar slug libre: original-copia, original-copia-2, …
    let candidateSlug = `${src.slug}-copia`;
    let n = 1;
    while (await prisma.business.findUnique({ where: { slug: candidateSlug }, select: { id: true } })) {
      n += 1;
      candidateSlug = `${src.slug}-copia-${n}`;
    }

    try {
      const row = await prisma.$transaction(async (tx) => {
        const created = await tx.business.create({
          data: {
            slug: candidateSlug,
            name: `${src.name} (copia)`,
            ciudad: src.ciudad,
            telefono: src.telefono,
            whatsapp: src.whatsapp,
            email: src.email,
            web: src.web,
            titular: src.titular,
            numeroColegiado: src.numeroColegiado,
            logoUrl: src.logoUrl,
            descripcionCorta: (src.descripcionCorta ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            descripcionLarga: (src.descripcionLarga ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            direccion: (src.direccion ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            horarios: (src.horarios ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            redesSociales: (src.redesSociales ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            googleMapsUrl: src.googleMapsUrl,
            idiomasActivos: (src.idiomasActivos ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            mapaUrl: src.mapaUrl,
            heroChip: (src.heroChip ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            heroSubtitulo: (src.heroSubtitulo ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            heroTarjetasFlotantes: (src.heroTarjetasFlotantes ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            sobreNosotros: (src.sobreNosotros ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            avisoLegal: (src.avisoLegal ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            politicaPrivacidad: (src.politicaPrivacidad ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            textosServicios: (src.textosServicios ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            textosFaqs: (src.textosFaqs ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            textosResenas: (src.textosResenas ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            googleLocationName: src.googleLocationName,
            publishedStatus: 'draft',
            seoConfig: (src.seoConfig ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            modules: (src.modules ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            plan: src.plan,
          },
        });

        // Duplicar children (servicios/features/faqs — resenas NO: son de Google)
        if (src.servicios.length > 0) {
          await tx.servicio.createMany({
            data: src.servicios.map((s) => ({
              businessId: created.id,
              icono: s.icono,
              nombre: s.nombre as Prisma.InputJsonValue,
              descripcion: (s.descripcion ?? Prisma.JsonNull) as Prisma.InputJsonValue,
              enlace: (s.enlace ?? Prisma.JsonNull) as Prisma.InputJsonValue,
              orden: s.orden,
            })),
          });
        }
        if (src.features.length > 0) {
          await tx.contentFeature.createMany({
            data: src.features.map((f) => ({
              businessId: created.id,
              icono: f.icono,
              titulo: f.titulo as Prisma.InputJsonValue,
              descripcion: (f.descripcion ?? Prisma.JsonNull) as Prisma.InputJsonValue,
              orden: f.orden,
            })),
          });
        }
        if (src.faqs.length > 0) {
          await tx.faq.createMany({
            data: src.faqs.map((f) => ({
              businessId: created.id,
              pregunta: f.pregunta as Prisma.InputJsonValue,
              respuesta: f.respuesta as Prisma.InputJsonValue,
              orden: f.orden,
            })),
          });
        }
        // Imágenes: NO se duplican en Fase B (hay que copiar también en R2 → Fase C).

        return tx.business.findUnique({
          where: { id: created.id },
          include: CONTENT_INCLUDE,
        });
      });

      if (!row) return { ok: false, error: 'Error duplicando' };
      return { ok: true, data: mapBusinessToFarmacia(row as BusinessWithContent) };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Error desconocido al duplicar' };
    }
  },
};
