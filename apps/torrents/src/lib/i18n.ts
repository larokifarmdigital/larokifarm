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

/**
 * Parte un título en (inicio normal + final resaltado) para pintar las últimas
 * palabras en color, igual que la sección "Sobre nosotros".
 * Resalta las dos últimas palabras, dejando siempre al menos la primera en normal.
 */
export function resaltarTitulo(texto: string): { inicio: string; resaltado: string } {
  const palabras = texto.trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return { inicio: '', resaltado: '' };
  if (palabras.length === 1) return { inicio: '', resaltado: palabras[0] };
  const corte = Math.max(palabras.length - 2, 1);
  return {
    inicio: palabras.slice(0, corte).join(' '),
    resaltado: palabras.slice(corte).join(' '),
  };
}
