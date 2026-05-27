import type { Rule } from 'sanity';

type EntradaI18n = { _key?: string; language?: string; value?: unknown };

function valorTieneContenido(valor: unknown): boolean {
  if (valor === null || valor === undefined) return false;
  if (typeof valor === 'string') return valor.trim().length > 0;
  if (Array.isArray(valor)) {
    return valor.some((bloque) => {
      if (!bloque || typeof bloque !== 'object') return false;
      const b = bloque as { _type?: string; children?: { text?: string }[] };
      if (b._type !== 'block') return true;
      return (b.children ?? []).some((c) => c.text && c.text.trim().length > 0);
    });
  }
  return Boolean(valor);
}

/**
 * Variante síncrona de `validarTodosIdiomasOninguno`: no hace fetch al
 * dataset. Asume la convención de IDs `idioma-<codigo>` que aplica el
 * studio para los docs `idioma`, así que deriva el código directamente
 * del _ref. Evita el bucle de renderizado que provocaba la versión async
 * cuando se aplica a múltiples campos i18n en un mismo documento.
 *
 * Misma semántica: "todos los idiomas activos del documento o ninguno".
 */
export const validarTodosIdiomasOninguno = (r: Rule) =>
  r.custom<EntradaI18n[] | undefined>((entradas, ctx) => {
    if (!entradas || !Array.isArray(entradas)) return true;
    const doc = ctx.document as
      | { idiomasActivos?: { _ref?: string }[] }
      | undefined;
    const refs = (doc?.idiomasActivos ?? [])
      .map((i) => i._ref)
      .filter((r): r is string => Boolean(r));
    if (refs.length === 0) return true;

    const codigos = refs
      .map((ref) => (ref.startsWith('idioma-') ? ref.slice('idioma-'.length) : ''))
      .filter((c): c is string => Boolean(c));
    if (codigos.length === 0) return true;

    const con = entradas
      .filter((e) => valorTieneContenido(e.value))
      .map((e) => e.language)
      .filter((l): l is string => Boolean(l));
    if (con.length === 0) return true;

    const faltan = codigos.filter((c) => !con.includes(c));
    if (faltan.length === 0) return true;
    return `Falta traducción en: ${faltan.join(', ')}. Si rellenas un idioma, debes rellenar todos los activos de este documento.`;
  });
