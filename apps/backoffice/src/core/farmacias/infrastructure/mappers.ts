// Mappers bidireccionales Business (Prisma) ↔ Farmacia (tipo UI).
// Los JSON blobs de Business se deserializan como objetos del tipo UI.
// Se asume que la BD guarda formatos "correctos" — para datos venidos de
// Sanity la migración (Fase D) hará la limpieza. Si una lectura trae algo
// malformado, los campos opcionales caen a undefined / arrays vacíos.

import type {
  Business,
  ContentFeature,
  ContentImage,
  Faq as PrismaFaq,
  Resena as PrismaResena,
  Servicio as PrismaServicio,
} from '@prisma/client';
import type { Direccion, Farmacia, FeatureTarjeta, Horario, HeroTarjetaFlotante, ImagenAsset, Redes, Resena, Servicio, SobreNosotros, TextosCabecera, Faq, SeoConfig, FarmaciaStatus } from '@/core/farmacias/domain';
import type { Locale, MultilangText } from '@/core/shared';
import { LOCALES } from '@/core/shared';

// ───────────────────────────────────────────────────────────────────
// Helpers de deserialización segura (nunca lanzan)
// ───────────────────────────────────────────────────────────────────

function asMultilang(v: unknown): MultilangText {
  if (!v || typeof v !== 'object') return {};
  const o = v as Record<string, unknown>;
  const out: MultilangText = {};
  for (const l of LOCALES) {
    const val = o[l];
    if (typeof val === 'string') out[l] = val;
  }
  return out;
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function asArray<T>(v: unknown, mapper: (x: unknown) => T | null): T[] {
  if (!Array.isArray(v)) return [];
  const out: T[] = [];
  for (const el of v) {
    const m = mapper(el);
    if (m !== null) out.push(m);
  }
  return out;
}

function asActiveLocales(v: unknown): Locale[] {
  const arr = asArray(v, (x) => (typeof x === 'string' && (LOCALES as string[]).includes(x) ? (x as Locale) : null));
  return arr.length > 0 ? arr : ['es'];
}

export function asStatus(v: string): FarmaciaStatus {
  return v === 'published' || v === 'archived' ? v : 'draft';
}

function asDireccion(v: unknown): Direccion | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const o = v as Record<string, unknown>;
  const d: Direccion = {
    calle: asString(o.calle),
    numero: asString(o.numero),
    ciudad: asString(o.ciudad),
    provincia: asString(o.provincia),
    cp: asString(o.cp),
    pais: asString(o.pais),
  };
  return d;
}

function asHorarios(v: unknown): Horario[] {
  return asArray<Horario>(v, (x) => {
    if (!x || typeof x !== 'object') return null;
    const o = x as Record<string, unknown>;
    const dia = o.dia;
    if (typeof dia !== 'string') return null;
    const validDias = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'] as const;
    if (!validDias.includes(dia as (typeof validDias)[number])) return null;
    return {
      dia: dia as Horario['dia'],
      tramos: asArray(o.tramos, (t) => {
        if (!t || typeof t !== 'object') return null;
        const to = t as Record<string, unknown>;
        if (typeof to.abre !== 'string' || typeof to.cierra !== 'string') return null;
        return { abre: to.abre, cierra: to.cierra };
      }),
      cerrado: typeof o.cerrado === 'boolean' ? o.cerrado : undefined,
      nota: o.nota ? asMultilang(o.nota) : undefined,
    };
  });
}

function asRedes(v: unknown): Redes | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const o = v as Record<string, unknown>;
  return {
    instagram: asString(o.instagram),
    facebook: asString(o.facebook),
    x: asString(o.x),
    tiktok: asString(o.tiktok),
    youtube: asString(o.youtube),
  };
}

function asSobreNosotros(v: unknown): SobreNosotros | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const o = v as Record<string, unknown>;
  return {
    chip: o.chip ? asMultilang(o.chip) : undefined,
    titulo: o.titulo ? asMultilang(o.titulo) : undefined,
    anyosExperiencia: typeof o.anyosExperiencia === 'number' ? o.anyosExperiencia : undefined,
    puntos: Array.isArray(o.puntos)
      ? (o.puntos as unknown[]).map((p) => asMultilang(p))
      : undefined,
  };
}

function asTextosCabecera(v: unknown): TextosCabecera | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const o = v as Record<string, unknown>;
  return {
    chip: o.chip ? asMultilang(o.chip) : undefined,
    titulo: o.titulo ? asMultilang(o.titulo) : undefined,
    subtitulo: o.subtitulo ? asMultilang(o.subtitulo) : undefined,
  };
}

function asHeroFloats(v: unknown): HeroTarjetaFlotante[] {
  return asArray<HeroTarjetaFlotante>(v, (x) => {
    if (!x || typeof x !== 'object') return null;
    const o = x as Record<string, unknown>;
    return {
      id: typeof o.id === 'string' ? o.id : crypto.randomUUID(),
      icono: asString(o.icono),
      titulo: asMultilang(o.titulo),
      subtitulo: asMultilang(o.subtitulo),
      orden: typeof o.orden === 'number' ? o.orden : 0,
    };
  }).sort((a, b) => a.orden - b.orden);
}

function asSeoConfig(v: unknown): SeoConfig | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const o = v as Record<string, unknown>;
  return {
    title: o.title ? asMultilang(o.title) : undefined,
    description: o.description ? asMultilang(o.description) : undefined,
    robots: asString(o.robots),
    // ogImage NO vive en seoConfig: sale de ContentImage(role='og'), ver mapBusinessToFarmacia.
  };
}

// ───────────────────────────────────────────────────────────────────
// Children mappers (filas de content_* → tipos UI)
// ───────────────────────────────────────────────────────────────────

function mapServicio(row: PrismaServicio): Servicio {
  const enlace = row.enlace && typeof row.enlace === 'object'
    ? (row.enlace as { url?: unknown; nuevaPestana?: unknown })
    : null;
  return {
    id: row.id,
    icono: row.icono ?? undefined,
    nombre: asMultilang(row.nombre),
    descripcion: row.descripcion ? asMultilang(row.descripcion) : undefined,
    enlace: enlace
      ? {
          url: typeof enlace.url === 'string' ? enlace.url : undefined,
          nuevaPestana: typeof enlace.nuevaPestana === 'boolean' ? enlace.nuevaPestana : undefined,
        }
      : undefined,
    orden: row.orden,
  };
}

function mapFeature(row: ContentFeature): FeatureTarjeta {
  return {
    id: row.id,
    icono: row.icono ?? undefined,
    titulo: asMultilang(row.titulo),
    descripcion: row.descripcion ? asMultilang(row.descripcion) : undefined,
    orden: row.orden,
  };
}

function mapFaq(row: PrismaFaq): Faq {
  return {
    id: row.id,
    pregunta: asMultilang(row.pregunta),
    respuesta: asMultilang(row.respuesta),
    orden: row.orden,
  };
}

function mapResena(row: PrismaResena): Resena {
  return {
    id: row.id,
    autor: row.autor,
    googleReviewId: row.googleReviewId ?? undefined,
    puntuacion: row.puntuacion,
    texto: row.texto ?? undefined,
    textoIdioma: row.textoIdioma ?? undefined,
    respuesta: row.respuesta ?? undefined,
    respuestaFecha: row.respuestaFecha?.toISOString(),
    fecha: row.fecha.toISOString(),
    fuente: row.fuente === 'google' || row.fuente === 'manual' ? row.fuente : 'google',
    avatarUrl: row.avatarUrl ?? undefined,
    destacada: row.destacada,
    oculta: row.oculta,
    eliminadaEnGoogle: row.eliminadaEnGoogle,
  };
}

function withOgImage(seo: SeoConfig | undefined, ogRow: ContentImage | undefined): SeoConfig | undefined {
  if (!ogRow) return seo;
  return { ...seo, ogImage: mapImagen(ogRow) };
}

function mapImagen(row: ContentImage): ImagenAsset {
  return {
    id: row.id,
    url: row.publicUrl,
    alt: asMultilang(row.alt),
    ancho: row.width ?? undefined,
    alto: row.height ?? undefined,
    peso: row.sizeBytes ?? undefined,
  };
}

// ───────────────────────────────────────────────────────────────────
// Business + hijos → Farmacia (lectura completa)
// ───────────────────────────────────────────────────────────────────

export type BusinessWithContent = Business & {
  servicios: PrismaServicio[];
  features: ContentFeature[];
  faqs: PrismaFaq[];
  resenas: PrismaResena[];
  imagenes: ContentImage[];
};

export function mapBusinessToFarmacia(b: BusinessWithContent): Farmacia {
  const imagenesByRole = b.imagenes.reduce<Record<string, ContentImage[]>>((acc, img) => {
    (acc[img.role] ??= []).push(img);
    return acc;
  }, {});
  const sortByOrden = (arr: ContentImage[]) => [...arr].sort((a, b_) => a.orden - b_.orden);

  const logoRow = imagenesByRole.logo?.[0];
  const logo: ImagenAsset | undefined = logoRow
    ? mapImagen(logoRow)
    : b.logoUrl
      ? { id: 'legacy-logo', url: b.logoUrl, alt: {} }
      : undefined;

  const heroImages = sortByOrden(imagenesByRole.hero ?? []).map(mapImagen);
  const imagenesSobre = sortByOrden(imagenesByRole.sobre ?? []).map(mapImagen);

  return {
    id: b.id,
    slug: b.slug,
    nombre: b.name,
    status: asStatus(b.publishedStatus),
    idiomasActivos: asActiveLocales(b.idiomasActivos),

    ciudad: b.ciudad ?? undefined,
    telefono: b.telefono ?? undefined,
    email: b.email ?? undefined,
    whatsapp: b.whatsapp ?? undefined,
    web: b.web ?? undefined,

    titular: b.titular ?? undefined,
    numeroColegiado: b.numeroColegiado ?? undefined,

    descripcionCorta: asMultilang(b.descripcionCorta),
    descripcionLarga: asMultilang(b.descripcionLarga),

    logo,
    heroImages,

    heroChip: b.heroChip ? asMultilang(b.heroChip) : undefined,
    heroSubtitulo: b.heroSubtitulo ? asMultilang(b.heroSubtitulo) : undefined,
    heroTarjetasFlotantes: asHeroFloats(b.heroTarjetasFlotantes),

    featuresLista: [...b.features].sort((a, c) => a.orden - c.orden).map(mapFeature),

    sobreNosotros: asSobreNosotros(b.sobreNosotros),
    imagenesSobre,

    avisoLegal: b.avisoLegal ? asMultilang(b.avisoLegal) : undefined,
    politicaPrivacidad: b.politicaPrivacidad ? asMultilang(b.politicaPrivacidad) : undefined,

    direccion: asDireccion(b.direccion),
    googleMapsUrl: b.googleMapsUrl ?? undefined,
    mapaUrl: b.mapaUrl ?? undefined,
    horarios: asHorarios(b.horarios),
    redes: asRedes(b.redesSociales),

    servicios: [...b.servicios].sort((a, c) => a.orden - c.orden).map(mapServicio),
    textosServicios: asTextosCabecera(b.textosServicios),

    faqs: [...b.faqs].sort((a, c) => a.orden - c.orden).map(mapFaq),
    textosFaqs: asTextosCabecera(b.textosFaqs),

    resenas: [...b.resenas].sort((a, c) => (a.fecha > c.fecha ? -1 : 1)).map(mapResena),
    textosResenas: asTextosCabecera(b.textosResenas),
    googleLocationName: b.googleLocationName ?? undefined,

    seo: withOgImage(asSeoConfig(b.seoConfig), imagenesByRole.og?.[0]),

    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    lastEditedBy: b.lastEditedByUserId ?? undefined,
  };
}

// ───────────────────────────────────────────────────────────────────
// Farmacia patch → Prisma Business update
// Separa campos escalares/JSON de las children collections (que van
// con replace-all strategy en la tx del repo, no aquí).
// ───────────────────────────────────────────────────────────────────

export type BusinessScalarPatch = {
  // Escalares directos
  name?: string;
  slug?: string;
  ciudad?: string | null;
  telefono?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  web?: string | null;
  titular?: string | null;
  numeroColegiado?: string | null;
  googleMapsUrl?: string | null;
  mapaUrl?: string | null;
  googleLocationName?: string | null;
  publishedStatus?: string;
  lastEditedByUserId?: string | null;
  lastPublishedAt?: Date | null;
  // JSON blobs
  idiomasActivos?: unknown;
  descripcionCorta?: unknown;
  descripcionLarga?: unknown;
  direccion?: unknown;
  horarios?: unknown;
  redesSociales?: unknown;
  heroChip?: unknown;
  heroSubtitulo?: unknown;
  heroTarjetasFlotantes?: unknown;
  sobreNosotros?: unknown;
  avisoLegal?: unknown;
  politicaPrivacidad?: unknown;
  textosServicios?: unknown;
  textosFaqs?: unknown;
  textosResenas?: unknown;
  seoConfig?: unknown;
};

export type ChildrenPatch = {
  servicios?: Servicio[];
  features?: FeatureTarjeta[];
  faqs?: Faq[];
};

export function splitFarmaciaPatch(patch: Partial<Farmacia>): {
  scalar: BusinessScalarPatch;
  children: ChildrenPatch;
} {
  const scalar: BusinessScalarPatch = {};
  const children: ChildrenPatch = {};

  if (patch.nombre !== undefined) scalar.name = patch.nombre;
  if (patch.slug !== undefined) scalar.slug = patch.slug;
  if (patch.ciudad !== undefined) scalar.ciudad = patch.ciudad ?? null;
  if (patch.telefono !== undefined) scalar.telefono = patch.telefono ?? null;
  if (patch.whatsapp !== undefined) scalar.whatsapp = patch.whatsapp ?? null;
  if (patch.email !== undefined) scalar.email = patch.email ?? null;
  if (patch.web !== undefined) scalar.web = patch.web ?? null;
  if (patch.titular !== undefined) scalar.titular = patch.titular ?? null;
  if (patch.numeroColegiado !== undefined) scalar.numeroColegiado = patch.numeroColegiado ?? null;
  if (patch.googleMapsUrl !== undefined) scalar.googleMapsUrl = patch.googleMapsUrl ?? null;
  if (patch.mapaUrl !== undefined) scalar.mapaUrl = patch.mapaUrl ?? null;
  if (patch.googleLocationName !== undefined) scalar.googleLocationName = patch.googleLocationName ?? null;

  if (patch.status !== undefined) {
    scalar.publishedStatus = patch.status;
    if (patch.status === 'published') scalar.lastPublishedAt = new Date();
  }

  if (patch.idiomasActivos !== undefined) scalar.idiomasActivos = patch.idiomasActivos;
  if (patch.descripcionCorta !== undefined) scalar.descripcionCorta = patch.descripcionCorta;
  if (patch.descripcionLarga !== undefined) scalar.descripcionLarga = patch.descripcionLarga;
  if (patch.direccion !== undefined) scalar.direccion = patch.direccion ?? null;
  if (patch.horarios !== undefined) scalar.horarios = patch.horarios;
  if (patch.redes !== undefined) scalar.redesSociales = patch.redes ?? null;
  if (patch.heroChip !== undefined) scalar.heroChip = patch.heroChip ?? null;
  if (patch.heroSubtitulo !== undefined) scalar.heroSubtitulo = patch.heroSubtitulo ?? null;
  if (patch.heroTarjetasFlotantes !== undefined) scalar.heroTarjetasFlotantes = patch.heroTarjetasFlotantes;
  if (patch.sobreNosotros !== undefined) scalar.sobreNosotros = patch.sobreNosotros ?? null;
  if (patch.avisoLegal !== undefined) scalar.avisoLegal = patch.avisoLegal ?? null;
  if (patch.politicaPrivacidad !== undefined) scalar.politicaPrivacidad = patch.politicaPrivacidad ?? null;
  if (patch.textosServicios !== undefined) scalar.textosServicios = patch.textosServicios ?? null;
  if (patch.textosFaqs !== undefined) scalar.textosFaqs = patch.textosFaqs ?? null;
  if (patch.textosResenas !== undefined) scalar.textosResenas = patch.textosResenas ?? null;
  if (patch.seo !== undefined) {
    // ogImage vive en content_images (role='og'); no duplicarla en el JSON.
    const seoSinOg = patch.seo ? { ...patch.seo } : null;
    if (seoSinOg) delete seoSinOg.ogImage;
    scalar.seoConfig = seoSinOg;
  }

  // Children (replace-all strategy en la tx del repo)
  if (patch.servicios !== undefined) children.servicios = patch.servicios;
  if (patch.featuresLista !== undefined) children.features = patch.featuresLista;
  if (patch.faqs !== undefined) children.faqs = patch.faqs;
  // Nota: resenas NO se tocan desde el editor (son read-only, worker Google las escribe).

  return { scalar, children };
}
