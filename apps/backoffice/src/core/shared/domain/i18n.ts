export type Locale = 'es' | 'en' | 'ca';

export const LOCALES: Locale[] = ['es', 'en', 'ca'];

export const LOCALE_LABELS: Record<Locale, string> = {
  es: 'Castellano',
  en: 'English',
  ca: 'Català',
};

export type MultilangText = Partial<Record<Locale, string>>;
