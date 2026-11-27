/**
 * Landings que ya tienen la página /vista-previa
 * (apps/<landing>/src/pages/vista-previa.astro). Al añadirla a otra landing,
 * se añade aquí su slug y el editor enseña el botón «Vista previa».
 */
const LANDINGS_CON_VISTA_PREVIA = new Set(['torrents']);

export function tieneVistaPrevia(slug: string): boolean {
  return LANDINGS_CON_VISTA_PREVIA.has(slug);
}

/** Mensaje que la vista previa entiende (ver el script de vista-previa.astro). */
export type MensajeSeccion = { tipo: 'larokifarm:seccion'; seccion: string; etiqueta: string };

/** Páginas de la landing que la vista previa sabe enseñar además del inicio. */
export const PAGINAS_VISTA_PREVIA = ['aviso-legal', 'politica-privacidad'] as const;
export type PaginaVistaPrevia = (typeof PAGINAS_VISTA_PREVIA)[number];

export function esPaginaVistaPrevia(v: unknown): v is PaginaVistaPrevia {
  return typeof v === 'string' && (PAGINAS_VISTA_PREVIA as readonly string[]).includes(v);
}
