import type { EntradaI18n } from './types.ts';

export const LOCALE_DEFECTO = 'es';

/**
 * Extrae el valor de un campo i18n (formato `[{ language, value }]` de la API pública del backoffice)
 * en el idioma pedido. Fallback al idioma por defecto y luego al primer valor con contenido.
 */
export function localizar<T>(
  entradas: EntradaI18n<T>[] | undefined | null,
  locale: string = LOCALE_DEFECTO,
  localeDefecto: string = LOCALE_DEFECTO,
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
