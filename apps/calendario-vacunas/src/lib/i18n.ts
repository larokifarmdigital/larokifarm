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
 * Construye la URL respetando el locale activo.
 * - es (default) → sin prefijo: `/`, `/aviso-legal`.
 * - otros locales → con prefijo: `/en`, `/ca/aviso-legal`.
 */
export function rutaConLocale(ruta: string, locale: Locale = LOCALE_DEFECTO): string {
  const normalizada = ruta.startsWith('/') ? ruta : `/${ruta}`;
  if (locale === LOCALE_DEFECTO) return normalizada;
  if (normalizada === '/') return `/${locale}`;
  return `/${locale}${normalizada}`;
}
