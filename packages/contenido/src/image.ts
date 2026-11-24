export type ImagenOpciones = {
  w?: number;
  h?: number;
  q?: number;
  fit?: 'crop' | 'max';
};

/**
 * Añade parámetros de transformación (w, h, fit, q, auto=format) a la URL de una
 * imagen del backoffice (`/api/content-images/:id` acepta los mismos que el CDN de Sanity).
 * Devuelve `undefined` si la URL no existe (cómodo para encadenar en plantillas).
 */
export function urlImagen(
  url: string | undefined,
  opts: ImagenOpciones = {},
): string | undefined {
  if (!url) return undefined;
  const { w, h, q = 80, fit = 'max' } = opts;
  const params = new URLSearchParams({ auto: 'format', q: String(q), fit });
  if (w) params.set('w', String(w));
  if (h) params.set('h', String(h));
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}${params.toString()}`;
}
