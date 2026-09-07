'use client';

/** Estructura de los inputs sincronizables con la URL. */
export interface UrlSearchParamsShape {
  cn?: string;
  ean?: string;
  nombre?: string;
}

/** Lee los inputs desde `window.location.search`. */
export function readUrlSearchParams(): UrlSearchParamsShape {
  if (typeof window === 'undefined') return {};
  const p = new URLSearchParams(window.location.search);
  const cn = p.get('cn')?.trim() || undefined;
  const ean = p.get('ean')?.trim() || undefined;
  const nombre = p.get('nombre')?.trim() || undefined;
  return { cn, ean, nombre };
}

/** Construye una URL absoluta con los params de búsqueda para compartir. */
export function buildShareUrl(input: UrlSearchParamsShape): string {
  if (typeof window === 'undefined') return '';
  const p = new URLSearchParams();
  if (input.cn) p.set('cn', input.cn);
  if (input.ean) p.set('ean', input.ean);
  if (input.nombre) p.set('nombre', input.nombre);
  const qs = p.toString();
  return `${window.location.origin}${window.location.pathname}${qs ? '?' + qs : ''}`;
}

/** Actualiza `window.location` con los params sin recargar la página. */
export function replaceUrlSearchParams(input: UrlSearchParamsShape): void {
  if (typeof window === 'undefined') return;
  const p = new URLSearchParams();
  if (input.cn) p.set('cn', input.cn);
  if (input.ean) p.set('ean', input.ean);
  if (input.nombre) p.set('nombre', input.nombre);
  const qs = p.toString();
  const url = `${window.location.pathname}${qs ? '?' + qs : ''}`;
  window.history.replaceState(null, '', url);
}
