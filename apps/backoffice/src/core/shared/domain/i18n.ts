/**
 * Catálogo CERRADO de idiomas de las webs de farmacia.
 *
 * Cada farmacia elige cuáles muestra (`idiomasActivos`). El castellano es
 * siempre el principal: raíz de la web (/) y texto de reserva cuando falta
 * una traducción. Añadir un idioma al catálogo exige también traducir los
 * textos fijos de cada landing (`apps/<landing>/src/i18n/<código>.json`).
 *
 * El orden importa: la API pública devuelve los textos en este orden
 * (es, en, ca primero, como antes de ampliar el catálogo).
 */
export const LOCALES = ['es', 'en', 'ca', 'fr', 'de', 'it', 'pt', 'eu', 'gl'] as const;

export type Locale = (typeof LOCALES)[number];

/** Idioma principal: no se desactiva y es el de reserva de la web. */
export const LOCALE_PRINCIPAL: Locale = 'es';

export function esLocale(v: unknown): v is Locale {
  return typeof v === 'string' && (LOCALES as readonly string[]).includes(v);
}

/** Nombre del idioma en su propio idioma (como lo ve un visitante). */
export const LOCALE_LABELS: Record<Locale, string> = {
  es: 'Castellano',
  en: 'English',
  ca: 'Català',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
  eu: 'Euskara',
  gl: 'Galego',
};

/** Nombre del idioma en castellano, en minúscula, para frases ("activar el inglés"). */
export const LOCALE_NOMBRE: Record<Locale, string> = {
  es: 'castellano',
  en: 'inglés',
  ca: 'catalán',
  fr: 'francés',
  de: 'alemán',
  it: 'italiano',
  pt: 'portugués',
  eu: 'euskera',
  gl: 'gallego',
};

/** Código corto para chips y contadores (las banderas son de países, no de idiomas). */
export const LOCALE_CODIGO: Record<Locale, string> = {
  es: 'ES',
  en: 'EN',
  ca: 'CA',
  fr: 'FR',
  de: 'DE',
  it: 'IT',
  pt: 'PT',
  eu: 'EU',
  gl: 'GL',
};

/** "Castellano (castellano)" no tiene sentido: nombre en castellano con mayúscula. */
export function nombreIdioma(l: Locale): string {
  const n = LOCALE_NOMBRE[l];
  return n.charAt(0).toUpperCase() + n.slice(1);
}

export type MultilangText = Partial<Record<Locale, string>>;
