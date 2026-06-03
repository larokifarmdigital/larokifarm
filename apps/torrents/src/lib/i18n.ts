import es from '@/i18n/es.json';
import en from '@/i18n/en.json';
import ca from '@/i18n/ca.json';

export const LOCALE_DEFECTO = 'es' as const;
export const LOCALES_DISPONIBLES = ['es', 'en', 'ca'] as const;
export type Locale = (typeof LOCALES_DISPONIBLES)[number];

const RECURSOS: Record<Locale, Record<string, unknown>> = {
  es,
  en,
  ca,
};

export function esLocaleValido(valor: unknown): valor is Locale {
  return (
    typeof valor === 'string' &&
    (LOCALES_DISPONIBLES as readonly string[]).includes(valor)
  );
}

export function localeDesdeParams(lang: string | undefined): Locale {
  if (esLocaleValido(lang)) return lang;
  return LOCALE_DEFECTO;
}

function obtenerCadenaProfunda(obj: unknown, ruta: string[]): unknown {
  let actual: unknown = obj;
  for (const seg of ruta) {
    if (actual && typeof actual === 'object' && seg in (actual as object)) {
      actual = (actual as Record<string, unknown>)[seg];
    } else {
      return undefined;
    }
  }
  return actual;
}

function interpolar(plantilla: string, vars?: Record<string, string | number>): string {
  if (!vars) return plantilla;
  return plantilla.replace(/\{(\w+)\}/g, (_match, clave: string) => {
    const valor = vars[clave];
    return valor === undefined || valor === null ? `{${clave}}` : String(valor);
  });
}

/**
 * Traduce una clave UI desde los JSON de /src/i18n.
 * Fallback automático al locale por defecto (es) si la clave no existe en el actual.
 * Si tampoco existe en es, devuelve la propia clave (señal de que falta traducción).
 */
export function t(
  clave: string,
  locale: Locale = LOCALE_DEFECTO,
  vars?: Record<string, string | number>,
): string {
  const ruta = clave.split('.');
  const valor = obtenerCadenaProfunda(RECURSOS[locale], ruta);
  if (typeof valor === 'string') return interpolar(valor, vars);

  if (locale !== LOCALE_DEFECTO) {
    const fallback = obtenerCadenaProfunda(RECURSOS[LOCALE_DEFECTO], ruta);
    if (typeof fallback === 'string') return interpolar(fallback, vars);
  }
  return clave;
}

/**
 * Devuelve un array de strings desde los JSON (ej.: "about.puntosDefecto").
 */
export function tArray(clave: string, locale: Locale = LOCALE_DEFECTO): string[] {
  const ruta = clave.split('.');
  const valor = obtenerCadenaProfunda(RECURSOS[locale], ruta);
  if (Array.isArray(valor) && valor.every((v) => typeof v === 'string')) return valor as string[];

  if (locale !== LOCALE_DEFECTO) {
    const fallback = obtenerCadenaProfunda(RECURSOS[LOCALE_DEFECTO], ruta);
    if (Array.isArray(fallback) && fallback.every((v) => typeof v === 'string')) {
      return fallback as string[];
    }
  }
  return [];
}

/**
 * Parte un título en (inicio normal + final resaltado) para pintar las últimas
 * palabras en color, igual que la sección "Sobre nosotros".
 * Resalta las dos últimas palabras, dejando siempre al menos la primera en normal.
 * Así, un título de dos palabras ("Nuestros servicios") resalta solo la última.
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

/**
 * Construye la URL de una ruta interna respetando el locale activo.
 * - locale por defecto → sin prefijo: `/`, `/aviso-legal`.
 * - otros locales → con prefijo: `/en`, `/ca/aviso-legal`.
 * No añade barra final (Astro está configurado con `trailingSlash: 'never'`).
 */
export function rutaConLocale(ruta: string, locale: Locale = LOCALE_DEFECTO): string {
  const normalizada = ruta.startsWith('/') ? ruta : `/${ruta}`;
  if (locale === LOCALE_DEFECTO) return normalizada === '/' ? '/' : normalizada;
  if (normalizada === '/') return `/${locale}`;
  return `/${locale}${normalizada}`;
}
