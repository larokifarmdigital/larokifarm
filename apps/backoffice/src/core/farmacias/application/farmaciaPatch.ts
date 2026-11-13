/**
 * Validación del patch que manda el autoguardado del editor.
 *
 * La server action es un endpoint público (cualquiera con sesión puede
 * llamarla con el body que quiera), así que aquí se decide qué se puede
 * escribir y con qué forma:
 *   - whitelist de campos: `status` NO (solo vía publicar/archivar), ni
 *     imágenes ni reseñas (tienen sus propias actions)
 *   - tipos y longitudes; slug con formato de URL
 *   - enlaces sin `javascript:` & co.
 *   - HTML de texto enriquecido saneado
 *   - tarjetas sin título descartadas (borradores vacíos)
 *
 * Lo que es "formato a medias" mientras se teclea (email incompleto, tramo
 * con cierre < apertura) NO se rechaza: rompería el autoguardado a mitad de
 * escribir. Eso se avisa en la UI y se filtra al publicar (publicContent).
 */

import { z } from 'zod';
import { LOCALES, type MultilangText, type SaveResult } from '@/core/shared';
import { isSafeHref } from '@/shared/lib/safeHref';
import { sanitizeRichHtml } from '@/shared/lib/safeHtml';
import type { Farmacia } from '../domain';

const LOCALE_SET = new Set<string>(LOCALES);
const SLUG_RE = /^[a-z0-9-]{1,60}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const str = (max: number) => z.string().max(max, `Máximo ${max} caracteres`);
const optStr = (max: number) => str(max).nullish();

/** `{ es, en, ca }` — descarta claves que no sean idiomas. */
const ml = (max = 5000) =>
  z.record(z.string(), str(max)).transform((r) => {
    const out: MultilangText = {};
    for (const [k, v] of Object.entries(r)) if (LOCALE_SET.has(k)) out[k as keyof MultilangText] = v;
    return out;
  });
const optMl = (max?: number) => ml(max).nullish();
const richMl = ml(100_000).transform((r) => {
  const out: MultilangText = {};
  for (const [k, v] of Object.entries(r)) out[k as keyof MultilangText] = sanitizeRichHtml(v ?? '');
  return out;
});

const safeUrl = (max = 2000) =>
  str(max).refine((u) => isSafeHref(u), 'Enlace no permitido (usa https://, mailto:, tel: o una ruta)');

const hasText = (t?: MultilangText | null) => Object.values(t ?? {}).some((v) => (v ?? '').trim() !== '');

const tramo = z.object({
  abre: z.string().refine((t) => t === '' || TIME_RE.test(t), 'Hora inválida'),
  cierra: z.string().refine((t) => t === '' || TIME_RE.test(t), 'Hora inválida'),
});

const horario = z.object({
  dia: z.enum(['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom']),
  tramos: z.array(tramo).max(2, 'Máximo 2 tramos por día'),
  cerrado: z.boolean().optional(),
  nota: optMl(300),
});

const servicio = z.object({
  id: str(64),
  icono: optStr(64),
  nombre: ml(200),
  descripcion: optMl(2000),
  enlace: z.object({ url: safeUrl().optional(), nuevaPestana: z.boolean().optional() }).nullish(),
  orden: z.number().int().min(0).max(1000),
});

const faq = z.object({
  id: str(64),
  pregunta: ml(500),
  respuesta: optMl(5000).transform((v) => v ?? {}),
  orden: z.number().int().min(0).max(1000),
});

const feature = z.object({
  id: str(64),
  icono: optStr(64),
  titulo: ml(200),
  descripcion: optMl(1000),
  orden: z.number().int().min(0).max(1000),
});

const heroTarjeta = z.object({
  id: str(64),
  icono: optStr(64),
  titulo: ml(200),
  subtitulo: optMl(300).transform((v) => v ?? {}),
  orden: z.number().int().min(0).max(1000),
});

const cabecera = z.object({ chip: optMl(200), titulo: optMl(300), subtitulo: optMl(1000) }).nullish();

const patchSchema = z
  .object({
    nombre: str(120),
    slug: z
      .string()
      .transform((s) => s.trim().toLowerCase())
      .refine((s) => SLUG_RE.test(s), 'Solo minúsculas, números y guiones (máx 60)'),
    idiomasActivos: z
      .array(z.enum(LOCALES as unknown as [string, ...string[]]))
      .min(1, 'Elige al menos un idioma')
      .transform((l) => LOCALES.filter((x) => l.includes(x))),
    ciudad: optStr(120),
    telefono: optStr(40),
    whatsapp: optStr(40),
    email: optStr(200),
    web: safeUrl().nullish(),
    titular: optStr(200),
    numeroColegiado: optStr(40),
    googleMapsUrl: safeUrl().nullish(),
    mapaUrl: safeUrl(4000).nullish(),
    googleLocationName: optStr(300),
    descripcionCorta: ml(400),
    descripcionLarga: richMl,
    avisoLegal: richMl.nullish(),
    politicaPrivacidad: richMl.nullish(),
    direccion: z
      .object({
        calle: optStr(200),
        numero: optStr(20),
        ciudad: optStr(120),
        provincia: optStr(120),
        cp: optStr(20),
        pais: optStr(80),
      })
      .nullish(),
    horarios: z.array(horario).max(7),
    redes: z
      .object({ instagram: optStr(200), facebook: optStr(200), x: optStr(200), tiktok: optStr(200), youtube: optStr(200) })
      .nullish(),
    heroChip: optMl(200),
    heroSubtitulo: optMl(300),
    heroTarjetasFlotantes: z.array(heroTarjeta).max(3).transform((l) => l.filter((t) => hasText(t.titulo))),
    featuresLista: z.array(feature).max(6).transform((l) => l.filter((t) => hasText(t.titulo))),
    sobreNosotros: z
      .object({
        chip: optMl(200),
        titulo: optMl(300),
        anyosExperiencia: z.number().int().min(0).max(300).nullish(),
        puntos: z.array(ml(300)).max(10).optional(),
      })
      .nullish(),
    servicios: z.array(servicio).max(50).transform((l) => l.filter((s) => hasText(s.nombre))),
    faqs: z.array(faq).max(50).transform((l) => l.filter((f) => hasText(f.pregunta))),
    textosServicios: cabecera,
    textosFaqs: cabecera,
    textosResenas: cabecera,
    seo: z.object({ title: optMl(120), description: optMl(320), robots: optStr(60) }).nullish(),
  })
  .partial(); // campos desconocidos (status, imágenes, reseñas…) → fuera

export function parseFarmaciaPatch(raw: unknown): SaveResult<Partial<Farmacia>> {
  const res = patchSchema.safeParse(raw);
  if (res.success) return { ok: true, data: res.data as Partial<Farmacia> };
  const fieldErrors: Record<string, string> = {};
  for (const issue of res.error.issues) {
    const key = issue.path.map(String).join('.') || 'patch';
    fieldErrors[key] ??= issue.message;
  }
  const [first] = Object.entries(fieldErrors);
  return { ok: false, error: first ? `${first[0]}: ${first[1]}` : 'Datos inválidos', fieldErrors };
}
