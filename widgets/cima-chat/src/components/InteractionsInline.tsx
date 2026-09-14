import { useState } from 'preact/hooks';
import { checkInteractions, type ChatCitation } from '../api/llm';
import type { CimaMedicamento } from '../api/types';
import { renderMarkdown } from '../lib/renderMarkdown';

interface Props {
  med: CimaMedicamento;
}

interface Result {
  text: string;
  citations: ChatCitation[];
}

const QUICK_MEDS = ['Ibuprofeno', 'Paracetamol', 'Omeprazol', 'Adiro'];

export function InteractionsInline({ med }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [other, setOther] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(otherMed: string) {
    const trimmed = otherMed.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const res = await checkInteractions([med.nombre, trimmed]);
    setLoading(false);
    if (res.ok) setResult({ text: res.text, citations: res.citations });
    else setError(res.error);
  }

  if (!expanded) {
    return (
      <div class="cima-alt-collapsed">
        <button
          type="button"
          class="cima-alt-toggle"
          onClick={() => setExpanded(true)}
        >
          <span class="cima-alt-toggle__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"/>
              <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"/>
            </svg>
          </span>
          <span>
            <strong>¿Combinás con otro medicamento?</strong>
            <div class="cima-alt-toggle__desc">
              Revisamos posibles interacciones documentadas
            </div>
          </span>
          <span class="cima-alt-toggle__arrow">→</span>
        </button>
      </div>
    );
  }

  return (
    <div class="cima-alt-chat">
      <div class="cima-alt-chat__header">
        <span class="cima-ia-summary__badge">Interacción</span>
        <button
          type="button"
          class="cima-alt-chat__close"
          onClick={() => {
            setExpanded(false);
            setResult(null);
            setError(null);
            setOther('');
          }}
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>

      {!result && (
        <>
          <div class="cima-inter-inline__current">
            <span class="cima-inter-inline__label">Actual</span>
            <span class="cima-inter-inline__value">{med.nombre}</span>
          </div>

          <form
            class="cima-alt-chat__form"
            onSubmit={(e) => {
              e.preventDefault();
              submit(other);
            }}
          >
            <input
              type="text"
              class="chat-ia__input"
              placeholder="Segundo medicamento (nombre)"
              value={other}
              onInput={(e) => setOther((e.target as HTMLInputElement).value)}
              disabled={loading}
              aria-label="Segundo medicamento"
            />
            <button
              type="submit"
              class="chat-ia__send"
              disabled={loading || other.trim().length < 3}
              aria-label="Comparar"
            >
              {loading ? '…' : '➤'}
            </button>
          </form>

          <div class="cima-alt-chat__prompts">
            <span class="cima-alt-chat__prompts-label">Frecuentes</span>
            {QUICK_MEDS.filter((m) => m.toLowerCase() !== med.nombre.toLowerCase()).map((m) => (
              <button
                key={m}
                type="button"
                class="chat-ia__prompt-chip"
                onClick={() => submit(m)}
                disabled={loading}
              >
                {m}
              </button>
            ))}
          </div>

          {error && <div class="cima-interactions__error">⚠️ {error}</div>}
        </>
      )}

      {result && (
        <div class="cima-alt-chat__entries">
          <div class="cima-alt-chat__entry">
            <div class="cima-alt-chat__answer">{renderMarkdown(result.text)}</div>
            {result.citations.length > 0 && (
              <div class="chat-ia__citations">
                <span class="chat-ia__citations-label">Fuentes</span>
                {result.citations.map((c, i) => (
                  <a
                    key={`${c.nregistro}-${c.seccion}-${i}`}
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="chat-ia__citation"
                  >
                    {c.nombre ?? `NR ${c.nregistro}`}
                    {c.seccion ? ` · s. ${c.seccion}` : ''} ↗
                  </a>
                ))}
              </div>
            )}
            <button
              type="button"
              class="cima-interactions__reset"
              onClick={() => {
                setResult(null);
                setOther('');
              }}
            >
              Comparar con otro
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
