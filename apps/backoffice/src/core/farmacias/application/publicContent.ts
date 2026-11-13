/**
 * Contenido PÚBLICO de farmacias para las landings (apps/torrents, apps/chamarro).
 *
 * Contrato: el JSON calca la forma de la proyección GROQ que usaban las
 * landings con Sanity (`FARMACIA_PROJECTION` en `src/lib/sanity.ts`), para
 * que sus componentes no cambien al pasar de Sanity a backoffice:
 *   - textos i18n → `[{ language, value }]` (lo que entiende `localizar()`)
 *   - texto enriquecido → mismo array pero con HTML como `value`
 *   - horarios → `{ dia: 'Mo', apertura, cierre, cerrado, tramos }`
 *   - imágenes → URL absoluta servida por el backoffice
 *
 * Extensiones respecto a Sanity (campos extra, la landing los puede ignorar):
 * `tramos` en horarios (2 tramos/día), `x`/`youtube` en redes.
 */

import { LOCALES, type MultilangText } from '@/core/shared';
import { isSafeHref } from '@/shared/lib/safeHref';
import { sanitizeRichHtml } from '@/shared/lib/safeHtml';
import type { StorageRepository } from '@/core/storage';
import type {
  Farmacia,
  FarmaciaRepository,
  Horario,
  ImagenAsset,
  Resena,
  ResenaRepository,
} from '../domain';

// ───────────────────────────────────────────────────────────────────
// Contrato
// ───────────────────────────────────────────────────────────────────

type I18n = { language: string; value: string }[];

export type LandingHorarioDia = {
  dia: 'Mo' | 'Tu' | 'We' | 'Th' | 'Fr' | 'Sa' | 'Su';
  apertura?: string;
  cierre?: string;
  cerrado?: boolean;
  tramos?: { apertura: string; cierre: string }[];
};

export type LandingResena = {
  _id: string;
  googleReviewId?: string;
  autorNombre: string;
  autorFotoUrl?: string;
  rating: number;
  comentario?: string;
  comentarioIdioma?: string;
  respuestaOwner?: string;
  respuestaOwnerFecha?: string;
  fechaPublicacion: string;
  destacada: boolean;
};

const DIA_LANDING: Record<Horario['dia'], LandingHorarioDia['dia']> = {
  lun: 'Mo', mar: 'Tu', mie: 'We', jue: 'Th', vie: 'Fr', sab: 'Sa', dom: 'Su',
};

/** Nombres tal cual los tenía el documento `idioma` de Sanity. */
const IDIOMA_NOMBRE: Record<string, string> = { es: 'Español', en: 'English', ca: 'Català' };

/** Tiptap emite `<p></p>` para un campo vacío. */
const isBlankHtml = (v: string) => v.replace(/<p>\s*<\/p>/g, '').trim() === '';

function i18n(t: MultilangText | undefined, { html = false } = {}): I18n | undefined {
  if (!t) return undefined;
  const out = LOCALES.flatMap((language) => {
    const value = t[language];
    if (typeof value !== 'string' || value.trim() === '' || (html && isBlankHtml(value))) return [];
    return [{ language, value: html ? sanitizeRichHtml(value) : value }];
  });
  return out.length ? out : undefined;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Enlaces que llegan a un `href`: solo los seguros (sin `javascript:` & co). */
const safeHref = (u?: string) => (u && isSafeHref(u) ? u : undefined);
const httpUrl = (u?: string) => (u && /^https?:\/\//i.test(u.trim()) ? u.trim() : undefined);
/** El iframe del mapa solo puede ser de Google (la CSP de las landings tampoco admite otro). */
const googleEmbed = (u?: string) => {
  const url = httpUrl(u);
  if (!url) return undefined;
  try {
    const host = new URL(url).hostname;
    return /(^|\.)google\.[a-z.]+$/.test(host) ? url : undefined;
  } catch {
    return undefined;
  }
};

/** Tarjetas sin título en ningún idioma = borrador a medias: no se publican. */
const hasText = (t: MultilangText | undefined) => Boolean(i18n(t));

function cabecera(t: Farmacia['textosServicios']) {
  if (!t) return undefined;
  return { chip: i18n(t.chip), titulo: i18n(t.titulo), subtitulo: i18n(t.subtitulo) };
}

function horario(h: Horario): LandingHorarioDia {
  const tramos = h.tramos.filter((t) => t.abre && t.cierra);
  const cerrado = Boolean(h.cerrado) || tramos.length === 0;
  return {
    dia: DIA_LANDING[h.dia],
    cerrado,
    ...(cerrado
      ? {}
      : {
          // apertura/cierre = jornada completa, para landings que solo leen 1 tramo
          apertura: tramos[0].abre,
          cierre: tramos[tramos.length - 1].cierra,
          tramos: tramos.map((t) => ({ apertura: t.abre, cierre: t.cierra })),
        }),
  };
}

export function toLandingFarmacia(f: Farmacia, baseUrl: string) {
  const abs = (url: string) => (url.startsWith('/') ? `${baseUrl}${url}` : url);
  const img = (i: ImagenAsset) => ({ url: abs(i.url), alt: i18n(i.alt) });
  const calle = [f.direccion?.calle, f.direccion?.numero].filter(Boolean).join(', ') || undefined;

  return {
    _id: f.id,
    nombre: f.nombre,
    slug: f.slug,
    idiomasActivos: f.idiomasActivos.map((codigo) => ({ codigo, nombre: IDIOMA_NOMBRE[codigo] ?? codigo })),
    logo: f.logo ? abs(f.logo.url) : undefined,
    imagenes: f.heroImages.map(img),
    imagenesSobre: (f.imagenesSobre ?? []).map(img),
    titular: f.titular,
    numeroColegiado: f.numeroColegiado,
    descripcionCorta: i18n(f.descripcionCorta),
    descripcionLarga: i18n(f.descripcionLarga, { html: true }),
    sobreNosotros: f.sobreNosotros && {
      chip: i18n(f.sobreNosotros.chip),
      titulo: i18n(f.sobreNosotros.titulo),
      anyosExperiencia: f.sobreNosotros.anyosExperiencia,
      puntos: (f.sobreNosotros.puntos ?? []).map((p) => i18n(p)).filter(Boolean),
    },
    faqs: f.faqs.filter((q) => hasText(q.pregunta)).map((q) => ({ pregunta: i18n(q.pregunta), respuesta: i18n(q.respuesta) })),
    direccion: f.direccion && {
      calle,
      codigoPostal: f.direccion.cp,
      ciudad: f.direccion.ciudad ?? f.ciudad,
      provincia: f.direccion.provincia,
      pais: f.direccion.pais,
    },
    mapaUrl: googleEmbed(f.mapaUrl),
    contacto: {
      telefono: f.telefono,
      whatsapp: f.whatsapp,
      email: f.email && EMAIL_RE.test(f.email.trim()) ? f.email.trim() : undefined,
      web: httpUrl(f.web),
    },
    horarios: f.horarios.map(horario),
    servicios: f.servicios.filter((s) => hasText(s.nombre)).map((s) => ({
      nombre: i18n(s.nombre),
      descripcion: i18n(s.descripcion),
      icono: s.icono,
      enlace: safeHref(s.enlace?.url) ? s.enlace : undefined,
    })),
    redesSociales: f.redes,
    seo: {
      titulo: i18n(f.seo?.title),
      descripcion: i18n(f.seo?.description),
      imagenOg: f.seo?.ogImage ? { asset: { url: abs(f.seo.ogImage.url) } } : undefined,
    },
    googleLocationName: f.googleLocationName,
    googleMapsUrl: httpUrl(f.googleMapsUrl),
    heroChip: i18n(f.heroChip),
    heroSubtitulo: i18n(f.heroSubtitulo),
    heroTarjetasFlotantes: (f.heroTarjetasFlotantes ?? []).filter((t) => hasText(t.titulo)).map((t) => ({
      icono: t.icono,
      titulo: i18n(t.titulo),
      subtitulo: i18n(t.subtitulo),
    })),
    featuresLista: (f.featuresLista ?? []).filter((t) => hasText(t.titulo)).map((t) => ({
      icono: t.icono,
      titulo: i18n(t.titulo),
      descripcion: i18n(t.descripcion),
    })),
    textosServicios: cabecera(f.textosServicios),
    textosFaqs: cabecera(f.textosFaqs),
    textosResenas: cabecera(f.textosResenas),
    avisoLegal: i18n(f.avisoLegal, { html: true }),
    politicaPrivacidad: i18n(f.politicaPrivacidad, { html: true }),
  };
}

export type LandingFarmacia = ReturnType<typeof toLandingFarmacia>;

/** Reseñas visibles (no ocultas ni borradas en Google), más recientes primero. */
export function toLandingResenas(resenas: Resena[], baseUrl: string): LandingResena[] {
  return resenas
    .filter((r) => !r.oculta && !r.eliminadaEnGoogle)
    .sort((a, b) => (a.fecha > b.fecha ? -1 : 1))
    .map((r) => ({
      _id: r.id,
      googleReviewId: r.googleReviewId,
      autorNombre: r.autor,
      autorFotoUrl: r.avatarUrl ? (r.avatarUrl.startsWith('/') ? `${baseUrl}${r.avatarUrl}` : r.avatarUrl) : undefined,
      rating: r.puntuacion,
      comentario: r.texto,
      comentarioIdioma: r.textoIdioma,
      respuestaOwner: r.respuesta,
      respuestaOwnerFecha: r.respuestaFecha,
      fechaPublicacion: r.fecha,
      destacada: r.destacada,
    }));
}

// ───────────────────────────────────────────────────────────────────
// Use cases
// ───────────────────────────────────────────────────────────────────

/** Solo farmacias publicadas: un borrador o archivada no existe para la web. */
export class GetPublishedFarmaciaUseCase {
  constructor(private readonly repo: FarmaciaRepository) {}

  execute(slug: string): Promise<Farmacia | null> {
    return this.repo.getPublishedFarmaciaBySlug(slug);
  }
}

export class GetResenaAvatarUseCase {
  constructor(
    private readonly resenas: ResenaRepository,
    private readonly storage: StorageRepository,
  ) {}

  async execute(
    resenaId: string,
  ): Promise<{ ok: true; data: Buffer; contentType: string } | { ok: false; reason: 'not-found' | 'storage-error' }> {
    const key = await this.resenas.findVisibleAvatarKey(resenaId);
    if (!key) return { ok: false, reason: 'not-found' };
    try {
      return { ok: true, ...(await this.storage.read(key)) };
    } catch {
      return { ok: false, reason: 'storage-error' };
    }
  }
}
