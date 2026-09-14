import type { VNode } from 'preact';

/**
 * Mini renderer de Markdown para respuestas del LLM.
 * Soporta lo esencial que devuelve Gemini:
 *   **bold**            → <strong>
 *   *italic*            → <em>
 *   `code`              → <code>
 *   [texto](url)        → <a target="_blank">
 *   * / - al inicio     → bullet ·
 *   línea vacía         → párrafo nuevo
 *   ## / ### al inicio  → título pequeño en bold
 *
 * NO usamos dangerouslySetInnerHTML: creamos nodos Preact directamente,
 * lo que evita XSS incluso si el LLM devolviera algo raro.
 */

/** Parsea inline: bold, italic, code, links dentro de una línea. */
function parseInline(text: string): (string | VNode)[] {
  const out: (string | VNode)[] = [];
  // Regex con grupos alternativos: bold, italic, code, link
  const regex = /\*\*(.+?)\*\*|\*([^*]+?)\*|`([^`]+?)`|\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      out.push(text.slice(lastIndex, match.index));
    }
    if (match[1] !== undefined) {
      out.push(<strong>{match[1]}</strong>);
    } else if (match[2] !== undefined) {
      out.push(<em>{match[2]}</em>);
    } else if (match[3] !== undefined) {
      out.push(<code class="cima-md-code">{match[3]}</code>);
    } else if (match[4] !== undefined && match[5] !== undefined) {
      out.push(
        <a href={match[5]} target="_blank" rel="noopener noreferrer">
          {match[4]}
        </a>,
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    out.push(text.slice(lastIndex));
  }
  return out;
}

/**
 * Renderiza el texto Markdown como VNode.
 * Estrategia: agrupamos líneas consecutivas en bloques (párrafo, lista, título).
 */
export function renderMarkdown(text: string): VNode {
  if (!text) return <></>;
  const lines = text.split(/\r?\n/);

  interface Block {
    kind: 'p' | 'ul' | 'h';
    lines: string[];
    level?: number;
  }

  const blocks: Block[] = [];
  let currentP: string[] = [];
  let currentList: string[] = [];

  const flushP = () => {
    if (currentP.length > 0) {
      blocks.push({ kind: 'p', lines: [...currentP] });
      currentP = [];
    }
  };
  const flushList = () => {
    if (currentList.length > 0) {
      blocks.push({ kind: 'ul', lines: [...currentList] });
      currentList = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushP();
      flushList();
      continue;
    }
    // Título ## o ###
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushP();
      flushList();
      blocks.push({ kind: 'h', level: heading[1].length, lines: [heading[2]] });
      continue;
    }
    // Bullet * o -
    const bullet = line.match(/^\s*[*-]\s+(.+)$/);
    if (bullet) {
      flushP();
      currentList.push(bullet[1]);
      continue;
    }
    flushList();
    currentP.push(line);
  }
  flushP();
  flushList();

  return (
    <>
      {blocks.map((b, i) => {
        if (b.kind === 'h') {
          return (
            <div key={i} class={`cima-md-h cima-md-h-${b.level}`}>
              {parseInline(b.lines[0])}
            </div>
          );
        }
        if (b.kind === 'ul') {
          return (
            <ul key={i} class="cima-md-ul">
              {b.lines.map((li, j) => (
                <li key={j}>{parseInline(li)}</li>
              ))}
            </ul>
          );
        }
        // párrafo — soporta saltos de línea internos con <br>
        return (
          <p key={i} class="cima-md-p">
            {b.lines.map((ln, j) => (
              <>
                {j > 0 && <br />}
                {parseInline(ln)}
              </>
            ))}
          </p>
        );
      })}
    </>
  );
}
