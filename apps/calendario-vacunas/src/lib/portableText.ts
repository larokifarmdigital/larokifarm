import type {
  PortableTextBlock,
  PortableTextSpan,
  PortableTextMark,
} from '@larokifarm/calendario-vacunas';

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderSpan(
  span: PortableTextSpan,
  markDefs: PortableTextMark[],
): string {
  const text = escapeHtml(span.text ?? '');
  const marks = span.marks ?? [];
  if (marks.length === 0) return text;

  let open = '';
  let close = '';
  for (const mark of marks) {
    if (mark === 'strong') {
      open += '<strong>';
      close = '</strong>' + close;
    } else if (mark === 'em') {
      open += '<em>';
      close = '</em>' + close;
    } else if (mark === 'underline') {
      open += '<u>';
      close = '</u>' + close;
    } else {
      const def = markDefs.find((m) => m._key === mark);
      if (def?._type === 'link') {
        const href = escapeHtml(String(def.href ?? '#'));
        const externo = Boolean(def.externo);
        const attrs = externo
          ? ` target="_blank" rel="noopener noreferrer"`
          : '';
        open += `<a href="${href}"${attrs}>`;
        close = '</a>' + close;
      }
    }
  }
  return `${open}${text}${close}`;
}

function renderBlockInner(block: PortableTextBlock): string {
  const markDefs = block.markDefs ?? [];
  return (block.children ?? [])
    .map((child) => renderSpan(child, markDefs))
    .join('');
}

/**
 * Renderer mínimo para Portable Text usado en paginaLegal del calendario.
 * Soporta: h2/h3/h4, párrafos, blockquote, listas (bullet/number),
 * negrita, cursiva, subrayado y enlaces.
 */
export function renderPortableText(blocks: PortableTextBlock[]): string {
  if (!Array.isArray(blocks) || blocks.length === 0) return '';

  const out: string[] = [];
  let listType: 'bullet' | 'number' | null = null;

  const closeList = () => {
    if (listType) {
      out.push(listType === 'bullet' ? '</ul>' : '</ol>');
      listType = null;
    }
  };

  for (const block of blocks) {
    if (block._type !== 'block') continue;

    if (block.listItem) {
      const needType = block.listItem;
      if (listType !== needType) {
        closeList();
        out.push(needType === 'bullet' ? '<ul>' : '<ol>');
        listType = needType;
      }
      out.push(`<li>${renderBlockInner(block)}</li>`);
      continue;
    }

    closeList();
    const inner = renderBlockInner(block);
    const style = block.style ?? 'normal';
    switch (style) {
      case 'h2':
        out.push(`<h2>${inner}</h2>`);
        break;
      case 'h3':
        out.push(`<h3>${inner}</h3>`);
        break;
      case 'h4':
        out.push(`<h4>${inner}</h4>`);
        break;
      case 'blockquote':
        out.push(`<blockquote>${inner}</blockquote>`);
        break;
      default:
        out.push(`<p>${inner}</p>`);
    }
  }

  closeList();
  return out.join('\n');
}
