import { crearTraductor } from '@larokifarm/i18n-utils';
import es from '@/i18n/es.json';
import en from '@/i18n/en.json';
import ca from '@/i18n/ca.json';

export const LOCALE_DEFECTO = 'es' as const;
export const LOCALES_DISPONIBLES = ['es', 'en', 'ca'] as const;
export type Locale = (typeof LOCALES_DISPONIBLES)[number];

const traductor = crearTraductor<Locale>({
  recursos: { es, en, ca },
  localesDisponibles: LOCALES_DISPONIBLES,
  localeDefecto: LOCALE_DEFECTO,
});

export const { t, tArray, rutaConLocale, esLocaleValido } = traductor;

export function localeDesdeParams(lang: string | undefined): Locale {
  if (esLocaleValido(lang)) return lang;
  return LOCALE_DEFECTO;
}
