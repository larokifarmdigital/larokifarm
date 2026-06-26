import type { PortableBlock } from './types';

function escaparHtml(t: string): string {
  return t
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function bloqueInline(b: PortableBlock): string {
  const defs = b.markDefs ?? [];
  return (b.children ?? [])
    .map((span) => {
      let t = escaparHtml(span.text ?? '');
      const marks = span.marks ?? [];
      if (marks.includes('strong')) t = `<strong>${t}</strong>`;
      if (marks.includes('em')) t = `<em>${t}</em>`;
      if (marks.includes('underline')) t = `<u>${t}</u>`;
      const def = defs.find((d) => marks.includes(d._key));
      if (def && def._type === 'link' && def.href) {
        const href = escaparHtml(def.href);
        const attrs = def.externo ? ' target="_blank" rel="noopener noreferrer"' : '';
        t = `<a href="${href}"${attrs}>${t}</a>`;
      }
      return t;
    })
    .join('');
}

/**
 * Renderiza un array de bloques Portable Text (Sanity) a HTML plano.
 * Soporta encabezados h1-h4, listas bullet/number, blockquote, strong/em/underline,
 * y enlaces (markDefs de tipo `link` con flag `externo`).
 */
export function portableTextAHtml(bloques?: PortableBlock[] | null): string {
  if (!Array.isArray(bloques) || bloques.length === 0) return '';
  const salida: string[] = [];
  let listaAbierta: 'bullet' | 'number' | null = null;

  const cerrarLista = () => {
    if (listaAbierta) {
      salida.push(listaAbierta === 'number' ? '</ol>' : '</ul>');
      listaAbierta = null;
    }
  };

  for (const b of bloques) {
    if (b._type !== 'block') continue;
    const texto = bloqueInline(b);

    if (b.listItem === 'bullet' || b.listItem === 'number') {
      if (listaAbierta !== b.listItem) {
        cerrarLista();
        salida.push(b.listItem === 'number' ? '<ol>' : '<ul>');
        listaAbierta = b.listItem;
      }
      salida.push(`<li>${texto}</li>`);
      continue;
    }

    cerrarLista();
    const estilo = b.style ?? 'normal';
    if (estilo === 'h1') salida.push(`<h1>${texto}</h1>`);
    else if (estilo === 'h2') salida.push(`<h2>${texto}</h2>`);
    else if (estilo === 'h3') salida.push(`<h3>${texto}</h3>`);
    else if (estilo === 'h4') salida.push(`<h4>${texto}</h4>`);
    else if (estilo === 'blockquote') salida.push(`<blockquote>${texto}</blockquote>`);
    else salida.push(`<p>${texto}</p>`);
  }
  cerrarLista();
  return salida.join('');
}
