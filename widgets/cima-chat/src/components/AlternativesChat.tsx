import { useState } from 'preact/hooks';
import { findAlternatives, type ChatCitation } from '../api/llm';
import type { CimaMedicamento } from '../api/types';
import { renderMarkdown } from '../lib/renderMarkdown';

interface Props {
  med: CimaMedicamento;
}

interface QAEntry {
  id: string;
  query: string;
  text?: string;
  citations?: ChatCitation[];
  loading?: boolean;
  error?: string;
}

const QUICK_PROMPTS = [
  'Algo más barato (genérico)',
  'En gotas o jarabe (me cuesta tragar)',
  'Sin receta si es posible',
  'Apto durante embarazo',
];

function randomId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Extrae el ATC más específico del medicamento. */
function extractAtc(med: CimaMedicamento): string | undefined {
  if (!med.atcs || med.atcs.length === 0) return undefined;
  // El ATC más largo (nivel 5) es el más específico
  const sorted = [...med.atcs].sort(
    (a, b) => (b.codigo?.length ?? 0) - (a.codigo?.length ?? 0),
  );
  return sorted[0].codigo;
}

function extractPrincipios(med: CimaMedicamento): string | undefined {
  if (!med.principiosActivos || med.principiosActivos.length === 0) return undefined;
  return med.principiosActivos
    .map((p) => [p.nombre, p.cantidad, p.unidad].filter(Boolean).join(' '))
    .join(' + ');
}

export function AlternativesChat({ med }: Props) {
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [entries, setEntries] = useState<QAEntry[]>([]);
  const [expanded, setExpanded] = useState(false);

  const medContext = {
    nombre: med.nombre,
    nregistro: med.nregistro,
    principiosActivos: extractPrincipios(med),
    atc: extractAtc(med),
  };

  async function send(query: string) {
    const q = query.trim();
    if (!q || pending) return;
    const id = randomId();
    setEntries((prev) => [...prev, { id, query: q, loading: true }]);
    setInput('');
    setPending(true);

    const res = await findAlternatives(medContext, q);
    setPending(false);

    setEntries((prev) =>
      prev.map((e) =>
        e.id !== id
          ? e
          : res.ok
            ? { id, query: q, text: res.text, citations: res.citations }
            : { id, query: q, error: res.error },
      ),
    );
  }

  if (!expanded) {
    return (
      <div class="cima-alt-collapsed">
        <button
          type="button"
          class="cima-alt-toggle"
          onClick={() => setExpanded(true)}
        >
          <span class="cima-alt-toggle__icon">🔄</span>
          <span>
            <strong>Buscar una alternativa</strong>
            <div class="cima-alt-toggle__desc">
              Más económica, otra presentación, apta para tu perfil…
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
        <span class="cima-ia-summary__badge">Buscar alternativa</span>
        <button
          type="button"
          class="cima-alt-chat__close"
          onClick={() => setExpanded(false)}
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>

      {entries.length === 0 && (
        <div class="cima-alt-chat__prompts">
          <span class="cima-alt-chat__prompts-label">Prueba con:</span>
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              class="chat-ia__prompt-chip"
              onClick={() => send(p)}
              disabled={pending}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      <div class="cima-alt-chat__entries">
        {entries.map((e) => (
          <div key={e.id} class="cima-alt-chat__entry">
            <div class="cima-alt-chat__query">
              <strong>Vos:</strong> {e.query}
            </div>
            {e.loading ? (
              <div class="chat-ia__loading">
                <span class="chat-ia__dot" />
                <span class="chat-ia__dot" />
                <span class="chat-ia__dot" />
                <span class="chat-ia__loading-text">Buscando alternativas…</span>
              </div>
            ) : e.error ? (
              <div class="cima-interactions__error">⚠️ {e.error}</div>
            ) : (
              <>
                <div class="cima-alt-chat__answer">{renderMarkdown(e.text ?? '')}</div>
                {e.citations && e.citations.length > 0 && (
                  <div class="chat-ia__citations">
                    <span class="chat-ia__citations-label">Fuentes:</span>
                    {e.citations.map((c, i) => (
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
              </>
            )}
          </div>
        ))}
      </div>

      <form
        class="cima-alt-chat__form"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          type="text"
          class="chat-ia__input"
          placeholder="¿Qué alternativa necesitas?"
          value={input}
          onInput={(e) => setInput((e.target as HTMLInputElement).value)}
          disabled={pending}
          aria-label="Describe qué alternativa buscas"
        />
        <button
          type="submit"
          class="chat-ia__send"
          disabled={pending || input.trim().length < 3}
          aria-label="Enviar"
        >
          {pending ? '…' : '➤'}
        </button>
      </form>
    </div>
  );
}
