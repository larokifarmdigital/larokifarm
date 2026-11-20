export type Locale = 'es' | 'en' | 'ca';

export const LOCALES: Locale[] = ['es', 'en', 'ca'];

export const LOCALE_LABELS: Record<Locale, string> = {
  es: 'Castellano',
  en: 'English',
  ca: 'Català',
};

/** Nombre del idioma en castellano, en minúscula, para frases ("activar el inglés"). */
export const LOCALE_NOMBRE: Record<Locale, string> = {
  es: 'castellano',
  en: 'inglés',
  ca: 'catalán',
};

/** Bandera de cada idioma para la UI (catalán con la de Andorra). */
export const LOCALE_FLAGS: Record<Locale, string> = {
  es: '🇪🇸',
  en: '🇬🇧',
  ca: '🇦🇩',
};

export type MultilangText = Partial<Record<Locale, string>>;
