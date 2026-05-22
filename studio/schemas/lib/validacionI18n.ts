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
 * "Todos los idiomas activos del documento o ninguno":
 * si el editor rellena un campo i18n para algún idioma, debe rellenar el
 * mismo campo en todos los idiomas referenciados en `farmacia.idiomasActivos`.
 *
 * Si todos los idiomas están vacíos para ese campo, es aceptable.
 *
 * `idiomasActivos` es un array de referencias a docs `idioma`. Hay que
 * dereferenciarlos para conocer su `codigo`.
 */
export const validarTodosIdiomasOninguno = (r: Rule) =>
  r.custom<EntradaI18n[] | undefined>(async (entradas, ctx) => {
    if (!entradas || !Array.isArray(entradas)) return true;
    const doc = ctx.document as
      | { idiomasActivos?: { _ref?: string }[] }
      | undefined;
    const refs = (doc?.idiomasActivos ?? [])
      .map((i) => i._ref)
      .filter((r): r is string => Boolean(r));
    if (refs.length === 0) return true;

    const client = ctx.getClient({ apiVersion: '2024-10-01' });
    const idiomas = await client.fetch<{ codigo?: string }[]>(
      `*[_type=="idioma" && _id in $refs]{codigo}`,
      { refs },
    );
    const codigos = (idiomas ?? [])
      .map((i) => i.codigo)
      .filter((c): c is string => Boolean(c));
    if (codigos.length === 0) return true;

    const con = entradas
      .filter((e) => valorTieneContenido(e.value))
      .map((e) => e.language)
      .filter((l): l is string => Boolean(l));
    if (con.length === 0) return true;

    const faltan = codigos.filter((c) => !con.includes(c));
    if (faltan.length === 0) return true;
    return `Falta traducción en: ${faltan.join(', ')}. Si rellenas un idioma, debes rellenar todos los activos de esta farmacia.`;
  });

/**
 * Limita la longitud de la entrada por idioma.
 */
export const validarLongitudPorIdioma = (max: number) => (r: Rule) =>
  r.custom<EntradaI18n[] | undefined>((entradas) => {
    if (!entradas || !Array.isArray(entradas)) return true;
    for (const e of entradas) {
      if (typeof e.value === 'string' && e.value.length > max) {
        return `[${e.language ?? '?'}] El texto no puede superar ${max} caracteres.`;
      }
    }
    return true;
  });
