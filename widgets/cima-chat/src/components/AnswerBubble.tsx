import { useCallback, useState } from 'preact/hooks';
import type { CimaMedicamento, DocTipo } from '../api/types';
import { summarizeSection } from '../api/llm';

interface Props {
  question: string;
  answer: string;
  tipo: DocTipo;
  seccion: string;
  loading: boolean;
  med: CimaMedicamento;
}

function fullDocUrl(med: CimaMedicamento, tipo: DocTipo): string | undefined {
  return med.docs?.find((d) => d.tipo === tipo)?.urlHtml;
}

/** Extrae texto plano del HTML rich del texto de la sección — para pasar a Gemini. */
function htmlToPlain(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export function AnswerBubble({ question, answer, tipo, seccion, loading, med }: Props) {
  const full = fullDocUrl(med, tipo);
  const tipoLabel = tipo === 1 ? 'Ficha técnica' : 'Prospecto';
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const mode: 'paciente' | 'profesional' = tipo === 2 ? 'paciente' : 'profesional';

  const requestSummary = useCallback(async () => {
    if (summary || summaryLoading) return;
    const plain = htmlToPlain(answer);
    if (plain.length < 100) return;
    setSummaryLoading(true);
    setSummaryError(null);
    const res = await summarizeSection(plain, mode);
    setSummaryLoading(false);
    if (res.ok) setSummary(res.summary);
    else setSummaryError(res.error);
  }, [answer, mode, summary, summaryLoading]);

  return (
    <div class="cima-bubble-group">
      <div class="cima-bubble q">{question}</div>
      <div class="cima-bubble a">
        {loading ? (
          <span class="cima-loading">Buscando en la fuente oficial…</span>
        ) : answer.trim().length === 0 ? (
          <span class="cima-empty-answer">La sección está vacía o no disponible.</span>
        ) : (
          <>
            {summary && (
              <div class="cima-ia-summary">
                <div class="cima-ia-summary__header">
                  <span class="cima-ia-summary__badge">Versión resumida</span>
                  <button
                    type="button"
                    class="cima-ia-summary__dismiss"
                    onClick={() => setSummary(null)}
                    aria-label="Cerrar resumen"
                  >
                    ×
                  </button>
                </div>
                <div class="cima-ia-summary__text">{summary}</div>
              </div>
            )}
            <div
              class="cima-answer-text cima-rich"
              dangerouslySetInnerHTML={{ __html: answer }}
            />
          </>
        )}
        <div class="cima-bubble-source">
          Fuente: AEMPS · {tipoLabel} · sección {seccion}
          {full && (
            <>
              {' · '}
              <a href={full} target="_blank" rel="noopener noreferrer">Ver completo ↗</a>
            </>
          )}
          {answer.trim().length > 100 && !loading && !summary && (
            <>
              {' · '}
              <button
                type="button"
                class="cima-ia-summary__cta"
                onClick={requestSummary}
                disabled={summaryLoading}
              >
                {summaryLoading ? 'Preparando resumen…' : 'Ver versión resumida'}
              </button>
            </>
          )}
          {summaryError && (
            <span class="cima-ia-summary__error"> · {summaryError}</span>
          )}
        </div>
      </div>
    </div>
  );
}
