/**
 * Cliente del worker cima-chat-llm.
 * Endpoint configurable vía data-attribute o build env; default apunta al deploy productivo.
 */

const DEFAULT_LLM_URL =
  (typeof globalThis !== 'undefined' &&
    (globalThis as { __CIMA_LLM_URL__?: string }).__CIMA_LLM_URL__) ||
  'https://cima-chat-llm.larokifarmdigital.workers.dev';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface ChatCitation {
  nregistro: string;
  nombre?: string;
  seccion?: string;
  url?: string;
}

export interface ChatResponse {
  ok: boolean;
  cached?: boolean;
  text: string;
  citations: ChatCitation[];
  toolCallsUsed?: number;
}

export interface ChatError {
  ok: false;
  error: string;
}

function endpoint(path: string): string {
  return `${DEFAULT_LLM_URL}${path}`;
}

/** Chat libre con tool-use sobre CIMA. */
export async function sendChat(
  history: ChatMessage[],
  mode: 'paciente' | 'profesional' = 'paciente',
  signal?: AbortSignal
): Promise<ChatResponse | ChatError> {
  const res = await fetch(endpoint('/chat'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ history, mode }),
    signal
  });
  const data = (await res.json().catch(() => ({}))) as ChatResponse | ChatError;
  if (!res.ok || !data.ok) {
    return {
      ok: false,
      error: 'error' in data ? data.error : `Error ${res.status}`
    };
  }
  return data;
}

/** Resumen simple de una sección oficial en lenguaje paciente/profesional. */
export async function summarizeSection(
  sectionText: string,
  mode: 'paciente' | 'profesional' = 'paciente',
  signal?: AbortSignal
): Promise<{ ok: true; summary: string; cached?: boolean } | ChatError> {
  const res = await fetch(endpoint('/summarize-section'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sectionText, mode }),
    signal
  });
  const data = (await res.json().catch(() => ({}))) as
    | { ok: true; summary: string; cached?: boolean }
    | ChatError;
  if (!res.ok || !('ok' in data) || !data.ok) {
    return {
      ok: false,
      error: 'error' in data ? data.error : `Error ${res.status}`
    };
  }
  return data;
}

/** Cruce de interacciones entre 2-5 medicamentos. */
export async function checkInteractions(
  medicamentos: string[],
  signal?: AbortSignal
): Promise<ChatResponse | ChatError> {
  const res = await fetch(endpoint('/check-interactions'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ medicamentos }),
    signal
  });
  const data = (await res.json().catch(() => ({}))) as ChatResponse | ChatError;
  if (!res.ok || !data.ok) {
    return {
      ok: false,
      error: 'error' in data ? data.error : `Error ${res.status}`
    };
  }
  return data;
}

/** Buscador libre por síntoma con IA. */
export async function searchBySymptom(
  description: string,
  signal?: AbortSignal
): Promise<ChatResponse | ChatError> {
  const res = await fetch(endpoint('/symptom-search'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description }),
    signal
  });
  const data = (await res.json().catch(() => ({}))) as ChatResponse | ChatError;
  if (!res.ok || !data.ok) {
    return { ok: false, error: 'error' in data ? data.error : `Error ${res.status}` };
  }
  return data;
}

export interface AlternativesMedicamento {
  nombre: string;
  nregistro: string;
  principiosActivos?: string;
  atc?: string;
}

/** Explorador conversacional de alternativas. */
export async function findAlternatives(
  medicamento: AlternativesMedicamento,
  query: string,
  signal?: AbortSignal
): Promise<ChatResponse | ChatError> {
  const res = await fetch(endpoint('/alternatives'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ medicamento, query }),
    signal
  });
  const data = (await res.json().catch(() => ({}))) as ChatResponse | ChatError;
  if (!res.ok || !data.ok) {
    return { ok: false, error: 'error' in data ? data.error : `Error ${res.status}` };
  }
  return data;
}
