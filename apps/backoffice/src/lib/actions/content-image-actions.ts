'use server';

/**
 * Server actions para gestionar imágenes de contenido (hero, sobre, logo).
 *
 * Multi-tenant integrado: cada operación valida que la farmacia pertenece
 * al businessId del session.user, excepto SUPER_ADMIN (ve todos).
 *
 * El flujo normal desde el editor:
 *   1. uploadContentImage(businessId, 'hero', fd) → devuelve ImagenAsset con id + url
 *   2. (opcional) reorderContentImages(businessId, 'hero', [id1, id2, …])
 *   3. deleteContentImage(businessId, id)
 *
 * Las imágenes se sirven vía /api/content-images/<id> (proxy a R2 con
 * verificación de tenant); publicUrl queda guardada igual en la BD por si
 * en el futuro se usa CDN directo con firma.
 */

import { createId as cuid } from '@paralleldrive/cuid2';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { buildContentImageKey, getStorage } from '@/lib/storage';
import type { ImagenAsset, SaveResult, MultilangText } from '@/types/content';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif'];
const ROLES = ['logo', 'hero', 'sobre', 'servicio', 'gallery', 'og'] as const;
type ImageRole = (typeof ROLES)[number];

async function ensureCanWriteBusiness(businessId: string): Promise<{ slug: string }> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Sesión requerida');
  if (user.rol !== 'admin' && user.farmaciaId !== businessId) {
    throw new Error('Acceso denegado al negocio');
  }
  const b = await prisma.business.findUnique({ where: { id: businessId }, select: { slug: true } });
  if (!b) throw new Error('Farmacia no encontrada');
  return { slug: b.slug };
}

function badResult(msg: string): SaveResult<ImagenAsset> {
  return { ok: false, error: msg };
}

export async function uploadContentImage(
  businessId: string,
  role: ImageRole,
  formData: FormData,
): Promise<SaveResult<ImagenAsset>> {
  try {
    if (!ROLES.includes(role)) return badResult(`Role inválido: ${role}`);

    const { slug } = await ensureCanWriteBusiness(businessId);

    const file = formData.get('file');
    if (!(file instanceof File)) return badResult('Falta el archivo');
    if (file.size > MAX_BYTES) return badResult(`Imagen muy grande (máx ${Math.round(MAX_BYTES / 1024 / 1024)} MB)`);
    if (!ALLOWED_TYPES.includes(file.type)) {
      return badResult(`Formato no permitido: ${file.type}. Usa PNG, JPG, WebP, SVG o GIF.`);
    }

    const altRaw = formData.get('alt');
    const alt: MultilangText = typeof altRaw === 'string' ? safeParseAlt(altRaw) : {};

    const id = cuid();
    const key = buildContentImageKey({ businessSlug: slug, role, cuid: id, filename: file.name });

    const bytes = Buffer.from(await file.arrayBuffer());
    const storage = getStorage();
    await storage.upload(key, bytes, file.type);

    // Para obtener dimensiones habría que usar sharp/image-size — fuera de scope
    // por ahora. Se dejan null; el editor puede rellenarlos al momento de usar
    // la imagen si importa.
    const row = await prisma.contentImage.create({
      data: {
        id,
        businessId,
        role,
        storageKey: key,
        publicUrl: `/api/content-images/${id}`,
        alt: alt as object,
        sizeBytes: bytes.byteLength,
        orden: await nextOrden(businessId, role),
      },
    });

    revalidatePath(`/farmacias/${businessId}`);

    return {
      ok: true,
      data: {
        id: row.id,
        url: row.publicUrl,
        alt,
        peso: row.sizeBytes ?? undefined,
      },
    };
  } catch (e) {
    return badResult(e instanceof Error ? e.message : 'Error desconocido al subir');
  }
}

export async function deleteContentImage(
  businessId: string,
  imageId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await ensureCanWriteBusiness(businessId);

    const img = await prisma.contentImage.findUnique({
      where: { id: imageId },
      select: { id: true, businessId: true, storageKey: true },
    });
    if (!img) return { ok: false, error: 'Imagen no encontrada' };
    if (img.businessId !== businessId) return { ok: false, error: 'Imagen de otro negocio' };

    // Borrar primero de R2 (best-effort) y luego la fila.
    const storage = getStorage();
    try {
      await storage.delete(img.storageKey);
    } catch {
      /* best-effort — si el objeto ya no está en R2, seguimos */
    }
    await prisma.contentImage.delete({ where: { id: imageId } });

    revalidatePath(`/farmacias/${businessId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

export async function reorderContentImages(
  businessId: string,
  role: ImageRole,
  orderedIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await ensureCanWriteBusiness(businessId);

    // Validamos que todos los ids pertenezcan al mismo business + role
    const imgs = await prisma.contentImage.findMany({
      where: { id: { in: orderedIds }, businessId, role },
      select: { id: true },
    });
    if (imgs.length !== orderedIds.length) {
      return { ok: false, error: 'Lista inválida (ids no pertenecen al negocio)' };
    }

    await prisma.$transaction(
      orderedIds.map((id, i) =>
        prisma.contentImage.update({ where: { id }, data: { orden: i } }),
      ),
    );

    revalidatePath(`/farmacias/${businessId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

async function nextOrden(businessId: string, role: ImageRole): Promise<number> {
  const last = await prisma.contentImage.findFirst({
    where: { businessId, role },
    orderBy: { orden: 'desc' },
    select: { orden: true },
  });
  return last ? last.orden + 1 : 0;
}

function safeParseAlt(raw: string): MultilangText {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      const out: MultilangText = {};
      for (const l of ['es', 'en', 'ca'] as const) {
        if (typeof parsed[l] === 'string') out[l] = parsed[l];
      }
      return out;
    }
  } catch {
    /* ignore */
  }
  return {};
}
