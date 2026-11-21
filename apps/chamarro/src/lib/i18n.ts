import { crearTraductor } from '@larokifarm/i18n-utils';
import es from '@/i18n/es.json';
import en from '@/i18n/en.json';
import ca from '@/i18n/ca.json';
import fr from '@/i18n/fr.json';
import de from '@/i18n/de.json';
import it from '@/i18n/it.json';
import pt from '@/i18n/pt.json';
import eu from '@/i18n/eu.json';
import gl from '@/i18n/gl.json';

export const LOCALE_DEFECTO = 'es' as const;
/**
 * Catálogo cerrado de idiomas (el mismo que el backoffice, `core/shared/domain/i18n.ts`).
 * Cada farmacia activa los suyos (`idiomasActivos`); solo esos generan rutas.
 * Los demás redirigen a la raíz en castellano (`pages/[inactivo]`, `_redirects`).
 */
export const LOCALES_DISPONIBLES = ['es', 'en', 'ca', 'fr', 'de', 'it', 'pt', 'eu', 'gl'] as const;
export type Locale = (typeof LOCALES_DISPONIBLES)[number];

/** Nombre de cada idioma en su propio idioma (selector de idioma). */
export const NOMBRE_IDIOMA: Record<Locale, string> = {
  es: 'Español',
  en: 'English',
  ca: 'Català',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
  eu: 'Euskara',
  gl: 'Galego',
};

/** Locale de Open Graph por idioma. */
export const OG_LOCALE: Record<Locale, string> = {
  es: 'es_ES',
  en: 'en_US',
  ca: 'ca_ES',
  fr: 'fr_FR',
  de: 'de_DE',
  it: 'it_IT',
  pt: 'pt_PT',
  eu: 'eu_ES',
  gl: 'gl_ES',
};

const traductor = crearTraductor<Locale>({
  recursos: { es, en, ca, fr, de, it, pt, eu, gl },
  localesDisponibles: LOCALES_DISPONIBLES,
  localeDefecto: LOCALE_DEFECTO,
});

export const { t, tArray, rutaConLocale, esLocaleValido } = traductor;

export function localeDesdeParams(lang: string | undefined): Locale {
  if (esLocaleValido(lang)) return lang;
  return LOCALE_DEFECTO;
}

/**
 * Idiomas activos de la farmacia (los que tienen web). Siempre incluye el
 * castellano y respeta el orden del catálogo.
 */
export function localesActivos(idiomas: { codigo: string }[] | undefined): Locale[] {
  const codigos = new Set((idiomas ?? []).map((i) => i.codigo));
  return LOCALES_DISPONIBLES.filter((l) => l === LOCALE_DEFECTO || codigos.has(l));
}

/** Nombres de los días por idioma (para `agruparHorarios`). */
export const DIAS_POR_IDIOMA = { es: es.dias, en: en.dias, ca: ca.dias, fr: fr.dias, de: de.dias, it: it.dias, pt: pt.dias, eu: eu.dias, gl: gl.dias } satisfies Record<Locale, unknown>;

/** "Cerrado" por idioma (días sin horario). */
export const CERRADO_POR_IDIOMA: Record<Locale, string> = {
  es: 'Cerrado',
  en: 'Closed',
  ca: 'Tancat',
  fr: 'Fermé',
  de: 'Geschlossen',
  it: 'Chiuso',
  pt: 'Fechado',
  eu: 'Itxita',
  gl: 'Pechado',
};
