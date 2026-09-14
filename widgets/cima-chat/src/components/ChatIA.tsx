import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { sendChat, type ChatCitation, type ChatMessage } from '../api/llm';
import { renderMarkdown } from '../lib/renderMarkdown';

interface ChatIAProps {
  mode?: 'paciente' | 'profesional';
  /** Si se pasa, el chat envía automáticamente este mensaje al montarse. */
  initialMessage?: string;
}

interface UIMessage extends ChatMessage {
  id: string;
  citations?: ChatCitation[];
  loading?: boolean;
  error?: string;
}

const WELCOME_TEXT =
  'Preguntá lo que necesites saber sobre medicamentos autorizados en España. Algunos ejemplos:\n\n• "¿Puedo tomar ibuprofeno si estoy embarazada?"\n• "¿Efectos secundarios del paracetamol 1 g?"\n• "¿Interacciones entre Adiro y omeprazol?"';

const SUGGESTED_PROMPTS = [
  'Mi bebé tiene fiebre desde ayer',
  '¿Se puede combinar Adiro con ibuprofeno?',
  '¿Es apto el paracetamol en lactancia?',
];

function randomId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ChatIA({ mode = 'paciente', initialMessage }: ChatIAProps) {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const autoSentRef = useRef(false);

  // Auto-scroll al final cuando se agrega mensaje
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Cleanup abort al desmontar
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || pending) return;

      const userMsg: UIMessage = { id: randomId(), role: 'user', text: trimmed };
      const loadingMsg: UIMessage = {
        id: randomId(),
        role: 'model',
        text: '',
        loading: true,
      };
      setMessages((prev) => [...prev, userMsg, loadingMsg]);
      setInput('');
      setPending(true);

      // Historial completo para dar contexto a Gemini (últimos 6 mensajes máx)
      const history: ChatMessage[] = [...messages, userMsg]
        .filter((m) => !m.loading && !m.error)
        .slice(-6)
        .map(({ role, text }) => ({ role, text }));

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const res = await sendChat(history, mode, controller.signal);
      setPending(false);

      setMessages((prev) => {
        const next = [...prev];
        const idx = next.findIndex((m) => m.id === loadingMsg.id);
        if (idx === -1) return prev;
        if (res.ok) {
          next[idx] = {
            id: loadingMsg.id,
            role: 'model',
            text: res.text,
            citations: res.citations,
          };
        } else {
          next[idx] = {
            id: loadingMsg.id,
            role: 'model',
            text: '',
            error: res.error,
          };
        }
        return next;
      });
    },
    [messages, pending, mode],
  );

  // Auto-envío del mensaje inicial cuando venimos del hero
  useEffect(() => {
    if (initialMessage && !autoSentRef.current) {
      autoSentRef.current = true;
      send(initialMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage]);

  return (
    <div class="chat-ia">
      <div class="chat-ia__messages" ref={scrollRef}>
        {messages.length === 0 && (
          <div class="chat-ia__welcome">
            <div class="chat-ia__welcome-text">{WELCOME_TEXT}</div>
            <div class="chat-ia__prompts">
              {SUGGESTED_PROMPTS.map((p) => (
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
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} class={`chat-ia__msg chat-ia__msg--${m.role}`}>
            {m.role === 'model' && (
              <span class="chat-ia__avatar" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 12h6M12 9v6"/>
                  <circle cx="12" cy="12" r="9"/>
                </svg>
              </span>
            )}
            <div class="chat-ia__msg-body">
              {m.loading ? (
                <div class="chat-ia__loading">
                  <span class="chat-ia__dot" />
                  <span class="chat-ia__dot" />
                  <span class="chat-ia__dot" />
                </div>
              ) : m.error ? (
                <div class="chat-ia__error">{m.error}</div>
              ) : (
                <>
                  <div class="chat-ia__bubble">
                    {m.role === 'model' ? renderMarkdown(m.text) : m.text}
                  </div>
                  {m.citations && m.citations.length > 0 && (
                    <div class="chat-ia__citations">
                      {m.citations.map((c, i) => (
                        <a
                          key={`${c.nregistro}-${c.seccion}-${i}`}
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          class="chat-ia__citation"
                          title={`${c.nombre ?? 'NR ' + c.nregistro}${c.seccion ? ' · sección ' + c.seccion : ''}`}
                        >
                          <span class="chat-ia__citation-num">{i + 1}</span>
                          <span class="chat-ia__citation-label">
                            {c.nombre ?? `NR ${c.nregistro}`}
                          </span>
                        </a>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <form
        class="chat-ia__form"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <textarea
          class="chat-ia__input"
          placeholder="Escribí un mensaje"
          value={input}
          rows={1}
          onInput={(e) => {
            const el = e.target as HTMLTextAreaElement;
            setInput(el.value);
            el.style.height = 'auto';
            el.style.height = Math.min(el.scrollHeight, 120) + 'px';
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              (e.currentTarget as HTMLTextAreaElement).form?.requestSubmit();
            }
          }}
          disabled={pending}
          aria-label="Escribí tu pregunta"
        />
        <button
          type="submit"
          class="chat-ia__send"
          disabled={pending || !input.trim()}
          aria-label="Enviar"
        >
          {pending ? (
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
              <rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7"/>
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}
