/**
 * Cloudflare Worker que expone endpoints REST para el widget cima-chat:
 *   POST /chat                → chat libre con tool-use sobre CIMA
 *   POST /summarize-section   → resumen simple de una sección
 *   POST /check-interactions  → cruce de secciones 4.5 entre 2+ medicamentos
 *   GET  /health              → status check
 *
 * Protecciones:
 * - Rate limit por IP en ventana de 60s (configurable en wrangler.toml).
 * - Cache Q&A frecuentes por hash de la pregunta (TTL 24h).
 * - CORS restringido a ALLOWED_ORIGIN.
 * - GEMINI_API_KEY en secret binding (nunca en frontend).
 */

import type { ChatMessage } from './geminiOrchestrator';
import { orchestrate, summarizeSection } from './geminiOrchestrator';

export interface Env {
  CACHE_KV: KVNamespace;
  GEMINI_API_KEY: string;
  ALLOWED_ORIGIN: string;
  RATE_LIMIT_PER_MIN: string;
}

const CACHE_TTL_SECONDS = 24 * 60 * 60; // 24h

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') return corsResponse(env);

    // Health check público
    if (url.pathname === '/health' && request.method === 'GET') {
      return json({ ok: true, service: 'cima-chat-llm', ts: Date.now() }, env);
    }

    // Rate limit por IP (aplica a todos los endpoints protegidos)
    const rateOk = await checkRateLimit(request, env);
    if (!rateOk) {
      return json(
        { ok: false, error: 'Demasiadas peticiones. Espera 1 minuto e inténtalo de nuevo.' },
        env,
        429,
      );
    }

    try {
      if (url.pathname === '/chat' && request.method === 'POST') {
        return await handleChat(request, env);
      }
      if (url.pathname === '/summarize-section' && request.method === 'POST') {
        return await handleSummarize(request, env);
      }
      if (url.pathname === '/check-interactions' && request.method === 'POST') {
        return await handleInteractions(request, env);
      }
      if (url.pathname === '/symptom-search' && request.method === 'POST') {
        return await handleSymptomSearch(request, env);
      }
      if (url.pathname === '/alternatives' && request.method === 'POST') {
        return await handleAlternatives(request, env);
      }
      return json({ ok: false, error: 'Endpoint no encontrado' }, env, 404);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[cima-chat-llm] ${message}`);
      return json({ ok: false, error: 'Error interno. Inténtalo de nuevo.' }, env, 500);
    }
  },
};

/* ============================================================
 * Handlers
 * ============================================================ */

async function handleChat(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as {
    history?: ChatMessage[];
    mode?: 'paciente' | 'profesional';
  } | null;

  if (!body || !Array.isArray(body.history) || body.history.length === 0) {
    return json({ ok: false, error: 'Falta el historial de mensajes.' }, env, 400);
  }

  // Cache: si la última pregunta ya fue respondida hace <24h, reutilizamos
  const lastUserMsg = [...body.history].reverse().find((m) => m.role === 'user')?.text ?? '';
  const cacheKey = await hashKey(`chat:${body.mode ?? 'paciente'}:${lastUserMsg}`);
  const cached = await env.CACHE_KV.get(cacheKey, 'json');
  if (cached) {
    return json({ ok: true, cached: true, ...cached }, env);
  }

  const result = await orchestrate(body.history, env.GEMINI_API_KEY);
  const payload = {
    text: result.text,
    citations: result.citations,
    toolCallsUsed: result.toolCallsUsed,
  };

  // Cachear solo respuestas exitosas (no vacías ni errores)
  if (result.text && result.text.length > 50) {
    await env.CACHE_KV.put(cacheKey, JSON.stringify(payload), {
      expirationTtl: CACHE_TTL_SECONDS,
    });
  }

  return json({ ok: true, cached: false, ...payload }, env);
}

async function handleSummarize(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as {
    sectionText?: string;
    mode?: 'paciente' | 'profesional';
  } | null;

  if (!body?.sectionText || body.sectionText.length < 50) {
    return json({ ok: false, error: 'Falta el texto de la sección.' }, env, 400);
  }
  const mode = body.mode === 'profesional' ? 'profesional' : 'paciente';

  const cacheKey = await hashKey(`sum:${mode}:${body.sectionText.slice(0, 500)}`);
  const cached = await env.CACHE_KV.get(cacheKey, 'json');
  if (cached) return json({ ok: true, cached: true, ...cached }, env);

  const summary = await summarizeSection(body.sectionText, mode, env.GEMINI_API_KEY);
  const payload = { summary };

  if (summary && summary.length > 30) {
    await env.CACHE_KV.put(cacheKey, JSON.stringify(payload), {
      expirationTtl: CACHE_TTL_SECONDS,
    });
  }

  return json({ ok: true, cached: false, ...payload }, env);
}

async function handleInteractions(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as {
    medicamentos?: string[]; // nombres o nregistros
  } | null;

  if (!body?.medicamentos || body.medicamentos.length < 2) {
    return json(
      { ok: false, error: 'Necesitas al menos 2 medicamentos para comprobar interacciones.' },
      env,
      400,
    );
  }
  if (body.medicamentos.length > 5) {
    return json({ ok: false, error: 'Máximo 5 medicamentos por chequeo.' }, env, 400);
  }

  // Delegamos al chat con un prompt específico — Gemini usará searchByName +
  // getMedicamentoDetail + getSeccion(4.5) para cada uno y cruzará resultados.
  const history: ChatMessage[] = [
    {
      role: 'user',
      text: `Responde en castellano de España (nunca voseo ni formas latinoamericanas). Comprueba si hay interacciones conocidas entre estos medicamentos: ${body.medicamentos.join(', ')}. Para cada uno, busca el medicamento en CIMA y lee la sección 4.5 (Interacciones). Luego cruza los resultados y responde:
1. Qué interacciones concretas están documentadas en la Ficha Técnica.
2. Qué combinar con precaución frente a qué evitar del todo.
3. Cita explícita de qué medicamento menciona cuál interacción.

Si CIMA no menciona interacción entre alguno, dilo explícitamente en vez de inventar.`,
    },
  ];

  const cacheKey = await hashKey(`inter:${body.medicamentos.sort().join('|').toLowerCase()}`);
  const cached = await env.CACHE_KV.get(cacheKey, 'json');
  if (cached) return json({ ok: true, cached: true, ...cached }, env);

  const result = await orchestrate(history, env.GEMINI_API_KEY);
  const payload = {
    text: result.text,
    citations: result.citations,
  };

  if (result.text && result.text.length > 50) {
    await env.CACHE_KV.put(cacheKey, JSON.stringify(payload), {
      expirationTtl: CACHE_TTL_SECONDS,
    });
  }

  return json({ ok: true, cached: false, ...payload }, env);
}

/* ============================================================
 * /symptom-search — buscador libre por síntoma con IA
 * ============================================================ */

const SYMPTOM_PROMPT = `Eres un asistente informativo de medicamentos OTC (venta libre) autorizados en España, respaldado por CIMA (AEMPS). Tu trabajo es dar RESPUESTAS ÚTILES y CONCRETAS ante una descripción de síntoma, no derivar por defecto al médico.

IDIOMA (obligatorio, no negociable):
- Responde SIEMPRE en castellano de España (español peninsular).
- Usa tuteo peninsular: "puedes", "toma", "mira", "busca", "consulta".
- PROHIBIDO el voseo o cualquier forma latinoamericana: nunca uses "vos", "podés", "tomá", "buscá", "consultá", "tenés", "sabés", "querés", "acá".
- Vocabulario habitual en España (farmacia, receta, prospecto, ficha técnica).

QUÉ HACER:
1. Interpreta el mensaje del usuario: síntoma principal, edad, duración, restricciones (embarazo, lactancia, comorbilidades, medicación actual).
2. Usa tools de CIMA para buscar principios activos OTC aptos para ese síntoma y perfil. Trae la sección 4.6 (embarazo) y 4.3 (contraindicaciones) si aplica.
3. Devuelve opciones concretas: nombres de principios activos (paracetamol, ibuprofeno, etc.) + nombres comerciales reales (Apiretal, Dalsy, etc.) + presentaciones típicas apropiadas para el perfil.
4. Advertencias específicas del perfil (edad, embarazo, medicación crónica).
5. Solo deriva al médico cuando hay banderas rojas reales, no como respuesta genérica.

BANDERAS ROJAS que SÍ obligan a derivar:
- Fiebre >39°C en <3 meses, o >72h sin bajar
- Rigidez de cuello, confusión, convulsiones, dificultad respiratoria
- Sangrado activo, dolor torácico, dolor abdominal severo
- Deshidratación (vómitos/diarrea >24h en niños o mayores)
- Empeoramiento rápido de cualquier síntoma

ESTRUCTURA:
- **Qué te puede servir**: 2-3 opciones OTC con nombre activo + comercial + justificación breve citando CIMA.
- **Ojo con**: advertencias para tu perfil (edad, embarazo…).
- **Consulta si**: bandera roja específica o umbral de tiempo.
- Cierre corto: "Ante dudas específicas, consulta con tu farmacéutico."

ESTILO: Castellano peninsular natural, máximo 250 palabras. No inventes datos: si CIMA no tiene información, dilo.

LO QUE NO HACER: nunca respondas solo "consulta a tu médico". Es una respuesta pobre. Da información útil ANTES de esa consulta.`;

async function handleSymptomSearch(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as {
    description?: string;
  } | null;

  if (!body?.description || body.description.trim().length < 5) {
    return json({ ok: false, error: 'Describe tu síntoma con más detalle.' }, env, 400);
  }

  const cacheKey = await hashKey(`symptom:${body.description.trim().toLowerCase()}`);
  const cached = await env.CACHE_KV.get(cacheKey, 'json');
  if (cached) return json({ ok: true, cached: true, ...cached }, env);

  const history: ChatMessage[] = [{ role: 'user', text: body.description.trim() }];
  const result = await orchestrate(history, env.GEMINI_API_KEY, SYMPTOM_PROMPT);
  const payload = { text: result.text, citations: result.citations };

  if (result.text && result.text.length > 50) {
    await env.CACHE_KV.put(cacheKey, JSON.stringify(payload), {
      expirationTtl: CACHE_TTL_SECONDS,
    });
  }

  return json({ ok: true, cached: false, ...payload }, env);
}

/* ============================================================
 * /alternatives — explorador conversacional de alternativas
 * ============================================================ */

function alternativesPrompt(medicamento: {
  nombre: string;
  nregistro: string;
  principiosActivos?: string;
  atc?: string;
}): string {
  return `Eres un asistente experto en medicamentos autorizados en España, respaldado por CIMA (AEMPS). El usuario está viendo la ficha del medicamento:

- Nombre: ${medicamento.nombre}
- Número de registro: ${medicamento.nregistro}
${medicamento.principiosActivos ? `- Principios activos: ${medicamento.principiosActivos}\n` : ''}${medicamento.atc ? `- Código ATC: ${medicamento.atc}\n` : ''}

El usuario quiere una alternativa terapéutica y va a describirte qué necesita (más barata, otra presentación, sin efecto adverso concreto, apta para su perfil, etc.).

IDIOMA (obligatorio): responde en castellano de España (español peninsular), con tuteo peninsular (puedes, toma, mira, busca, consulta). PROHIBIDO el voseo o formas latinoamericanas ("vos", "podés", "buscá", "consultá", "tenés", "acá"). Vocabulario habitual en España.

REGLAS:
1. Usa searchByATC (${medicamento.atc ?? 'según el ATC del medicamento actual'}) para traer alternativas del mismo grupo terapéutico.
2. Si el usuario pide criterios sobre efectos, embarazo, receta o interacciones, usa getSeccion en las alternativas candidatas para verificar antes de sugerir.
3. Filtra según lo que el usuario pidió y devuelve 2-3 alternativas concretas (nombre + por qué encaja).
4. Cita siempre la fuente CIMA (sección específica cuando aplique).
5. Si el usuario pide algo que CIMA no permite verificar (precio real, disponibilidad en su barrio), dilo explícitamente y sugiere consultar en la farmacia.
6. Cierre: "Esta información no sustituye la consulta con tu médico o farmacéutico. La elección final depende del criterio profesional."
7. Máximo 200 palabras.`;
}

async function handleAlternatives(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as {
    medicamento?: {
      nombre?: string;
      nregistro?: string;
      principiosActivos?: string;
      atc?: string;
    };
    query?: string;
  } | null;

  if (!body?.medicamento?.nombre || !body.medicamento.nregistro) {
    return json({ ok: false, error: 'Falta info del medicamento actual.' }, env, 400);
  }
  if (!body.query || body.query.trim().length < 3) {
    return json({ ok: false, error: 'Describe qué alternativa necesitas.' }, env, 400);
  }

  const cacheKey = await hashKey(
    `alt:${body.medicamento.nregistro}:${body.query.trim().toLowerCase()}`,
  );
  const cached = await env.CACHE_KV.get(cacheKey, 'json');
  if (cached) return json({ ok: true, cached: true, ...cached }, env);

  const prompt = alternativesPrompt({
    nombre: body.medicamento.nombre,
    nregistro: body.medicamento.nregistro,
    principiosActivos: body.medicamento.principiosActivos,
    atc: body.medicamento.atc,
  });

  const history: ChatMessage[] = [{ role: 'user', text: body.query.trim() }];
  const result = await orchestrate(history, env.GEMINI_API_KEY, prompt);
  const payload = { text: result.text, citations: result.citations };

  if (result.text && result.text.length > 50) {
    await env.CACHE_KV.put(cacheKey, JSON.stringify(payload), {
      expirationTtl: CACHE_TTL_SECONDS,
    });
  }

  return json({ ok: true, cached: false, ...payload }, env);
}

/* ============================================================
 * Utils: CORS, JSON, rate limit, hashing
 * ============================================================ */

function corsHeaders(env: Env): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function corsResponse(env: Env): Response {
  return new Response(null, { status: 204, headers: corsHeaders(env) });
}

function json(payload: unknown, env: Env, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
  });
}

async function checkRateLimit(request: Request, env: Env): Promise<boolean> {
  const ip =
    request.headers.get('CF-Connecting-IP') ??
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ??
    'unknown';
  const limit = parseInt(env.RATE_LIMIT_PER_MIN || '20', 10);
  const windowKey = `rl:${ip}:${Math.floor(Date.now() / 60_000)}`;
  const raw = await env.CACHE_KV.get(windowKey);
  const count = raw ? parseInt(raw, 10) : 0;
  if (count >= limit) return false;
  await env.CACHE_KV.put(windowKey, String(count + 1), { expirationTtl: 90 });
  return true;
}

async function hashKey(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}
