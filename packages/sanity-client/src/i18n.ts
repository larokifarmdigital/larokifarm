import type { EntradaI18n } from './types.ts';

export const LOCALE_DEFECTO_SANITY = 'es';

/**
 * Extrae el valor de un campo i18n (sanity-plugin-internationalized-array)
 * en el idioma pedido. Fallback al idioma por defecto y luego al primer valor con contenido.
 */
export function localizar<T>(
  entradas: EntradaI18n<T>[] | undefined | null,
  locale: string = LOCALE_DEFECTO_SANITY,
  localeDefecto: string = LOCALE_DEFECTO_SANITY,
): T | undefined {
  if (!Array.isArray(entradas) || entradas.length === 0) return undefined;

  const exacta = entradas.find((e) => e.language === locale);
  if (exacta && exacta.value !== undefined && exacta.value !== null) return exacta.value;

  if (locale !== localeDefecto) {
    const defecto = entradas.find((e) => e.language === localeDefecto);
    if (defecto && defecto.value !== undefined && defecto.value !== null) return defecto.value;
  }

  return entradas.find((e) => e.value !== undefined && e.value !== null)?.value;
}
