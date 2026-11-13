import sanitizeHtml from 'sanitize-html';

export { isSafeHref } from './safeHref';

/**
 * HTML de los campos de texto enriquecido (Tiptap): solo las etiquetas que el
 * editor puede producir. Se aplica al guardar y otra vez al publicar en la API
 * (los datos viejos o una llamada directa a la action no pasan por Tiptap).
 */
export function sanitizeRichHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'hr'],
    allowedAttributes: { a: ['href', 'target', 'rel'] },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, ...(attribs.target === '_blank' ? { rel: 'noopener noreferrer' } : {}) },
      }),
    },
  });
}
