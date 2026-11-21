import { LOCALES, type Locale } from '@/core/shared';
import type { Farmacia, ImagenAsset } from '../domain/models/Farmacia';

const LOCALE_SET = new Set<string>(LOCALES);

/** Un objeto es un texto multilang si TODAS sus claves son códigos de idioma. */
function esMultilang(o: Record<string, unknown>): boolean {
  const claves = Object.keys(o);
  return claves.length > 0 && claves.every((k) => LOCALE_SET.has(k));
}

/** Copia profunda sin el idioma `locale` en ningún texto multilang. */
function sinIdioma<T>(v: T, locale: Locale): T {
  if (Array.isArray(v)) return v.map((x) => sinIdioma(x, locale)) as T;
  if (!v || typeof v !== 'object') return v;
  const o = v as Record<string, unknown>;
  if (esMultilang(o)) {
    const { [locale]: _fuera, ...resto } = o;
    void _fuera;
    return resto as T;
  }
  return Object.fromEntries(Object.entries(o).map(([k, x]) => [k, sinIdioma(x, locale)])) as T;
}

/** Campos editables con textos multilang (los que guarda el autoguardado). */
const CAMPOS: (keyof Farmacia)[] = [
  'descripcionCorta',
  'descripcionLarga',
  'heroChip',
  'heroSubtitulo',
  'heroTarjetasFlotantes',
  'featuresLista',
  'sobreNosotros',
  'avisoLegal',
  'politicaPrivacidad',
  'horarios',
  'servicios',
  'textosServicios',
  'faqs',
  'textosFaqs',
  'textosResenas',
  'seo',
];

/**
 * Patch que borra un idioma de todos los textos de la farmacia. Solo incluye
 * los campos que cambian (así el guardado toca lo mínimo).
 */
export function patchSinIdioma(f: Farmacia, locale: Locale): Partial<Farmacia> {
  const patch: Partial<Farmacia> = {};
  for (const campo of CAMPOS) {
    const actual = f[campo];
    if (actual === undefined) continue;
    const nuevo = sinIdioma(actual, locale);
    if (JSON.stringify(nuevo) !== JSON.stringify(actual)) {
      (patch as Record<string, unknown>)[campo] = nuevo;
    }
  }
  return patch;
}

/** Imágenes cuya descripción (alt) tiene texto en ese idioma. */
export function imagenesConAltEn(f: Farmacia, locale: Locale): ImagenAsset[] {
  const todas = [f.logo, ...f.heroImages, ...(f.imagenesSobre ?? []), f.seo?.ogImage].filter(
    (i): i is ImagenAsset => !!i,
  );
  return todas.filter((i) => typeof i.alt?.[locale] === 'string');
}
