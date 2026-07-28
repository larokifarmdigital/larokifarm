/**
 * Adapter Gemini Search — motor primario de comparación cuando USE_GEMINI_SEARCH=1.
 *
 * Usa el modelo gemini-2.5-flash con la tool `google_search` (grounding) para pedirle
 * a Google que busque el producto en farmacias online españolas y devuelva precios reales
 * con URLs verificables. La respuesta viene como texto natural + citations de grounding;
 * la parseamos con un segundo prompt de structured output (necesario porque grounding y
 * responseSchema son mutuamente excluyentes en la API actual de Gemini).
 *
 * Sin SDK: fetch directo, mismo patrón que apps/conciliador-albaranes/src/core/engine/domain/extractDeliveryNote.ts.
 */

import type { ComparisonRow } from '../domain/models';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
// Pro para grounding: consistente invocando google_search. Si pro falla (saturación/timeout),
// caemos a flash como plan B — menos preciso pero mucho más rápido y menos saturado.
const MODEL_GROUNDING_PRIMARY = 'gemini-2.5-pro';
const MODEL_GROUNDING_FALLBACK = 'gemini-2.5-flash';
const MODEL_PARSE = 'gemini-2.5-flash';
const REQUEST_TIMEOUT_MS = 90_000; // pro con grounding puede tardar 60-90s en picos

export interface GeminiSearchInput {
  cn?: string;
  ean?: string;
  nombre?: string;
}

/* Estructura devuelta por Gemini tras el prompt de parseo. Cerrada y validada
   para que ningún campo extra que Gemini invente se cuele en la BD/UI. */
interface GeminiFarmaciaResult {
  nombre: string;
  precio: number;
  moneda?: string;
  url: string;
  disponibilidad?: 'en_stock' | 'agotado' | 'desconocido';
  /** "alto" si el precio aparece explícito con url matcheable; "medio"/"bajo" si es inferencia. */
  precio_confianza?: 'alto' | 'medio' | 'bajo';
}

interface GeminiParsedResponse {
  producto?: {
    nombre?: string;
    presentacion?: string;
    fabricante?: string;
    cn?: string;
    ean?: string;
  };
  farmacias: GeminiFarmaciaResult[];
}

/** Producto que Gemini identifica a partir de los resultados de Google. */
export interface IdentifiedProduct {
  nombre: string;
  presentacion?: string;
  fabricante?: string;
}

export interface GeminiSearchResult {
  product?: IdentifiedProduct;
  rows: ComparisonRow[];
}

/**
 * Punto de entrada principal. Hace UNA sola llamada con grounding que identifica el producto
 * a partir de los resultados de Google Y extrae los precios de cada farmacia. Devuelve ambos.
 * Nunca lanza — errores → row con status='not-found'.
 */
export async function searchAllPharmaciesViaGemini(
  input: GeminiSearchInput,
): Promise<GeminiSearchResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      rows: [nullRow('gemini', 'Gemini', 'Falta GEMINI_API_KEY en el servidor')],
    };
  }

  const logCtx = `[gemini-search cn=${input.cn ?? ''} ean=${input.ean ?? ''} nombre=${(input.nombre ?? '').slice(0, 40)}]`;

  try {
    // Paso 1: Gemini + google_search. Intento primero con pro (mejor calidad) y si falla por
    // saturación/timeout, caigo a flash (más rápido y menos saturado, aunque menos preciso).
    let grounded: { text: string; sources: GroundingSource[] } | null = null;
    try {
      grounded = await runGrounded(apiKey, input, /*forceSearch=*/ false, MODEL_GROUNDING_PRIMARY);
    } catch (err) {
      if (isTransientOrTimeout(err)) {
        console.warn(`${logCtx} pro falló (${errShort(err)}) → fallback a flash`);
        grounded = await runGrounded(apiKey, input, /*forceSearch=*/ false, MODEL_GROUNDING_FALLBACK);
      } else {
        throw err;
      }
    }

    if (!grounded) {
      console.warn(`${logCtx} paso 1: sin respuesta`);
      return {
        rows: [nullRow('gemini', 'Búsqueda Gemini', 'Gemini no devolvió respuesta — revisá los logs del servidor')],
      };
    }
    console.log(`${logCtx} paso 1 OK, ${grounded.text.length} chars, ${grounded.sources.length} URLs reales`);
    console.log(`${logCtx} preview: ${grounded.text.slice(0, 200)}...`);

    // Retry con prompt aún más agresivo si no invocó el tool en la primera pasada.
    if (grounded.sources.length === 0) {
      console.warn(`${logCtx} paso 1: 0 sources — retry con prompt forzado`);
      try {
        grounded = await runGrounded(apiKey, input, /*forceSearch=*/ true, MODEL_GROUNDING_PRIMARY);
      } catch (err) {
        if (isTransientOrTimeout(err)) {
          console.warn(`${logCtx} retry pro falló → fallback a flash`);
          grounded = await runGrounded(apiKey, input, /*forceSearch=*/ true, MODEL_GROUNDING_FALLBACK);
        } else {
          throw err;
        }
      }
      if (!grounded || grounded.sources.length === 0) {
        console.warn(`${logCtx} retry falló, Gemini se niega a usar google_search`);
        return {
          rows: [
            nullRow(
              'gemini',
              'Búsqueda Gemini',
              'Gemini no realizó búsqueda en Google incluso tras retry. Probá añadir el nombre del producto para dar más contexto.',
            ),
          ],
        };
      }
      console.log(`${logCtx} retry OK, ${grounded.sources.length} URLs reales`);
    }
    console.log(`${logCtx} sources: ${grounded.sources.slice(0, 5).map((s) => s.uri).join(' | ')}`);

    // Paso 2: parsear el texto libre a JSON estructurado, forzando a usar SOLO las URLs reales de grounding.
    const parsed = await runParse(apiKey, grounded.text, grounded.sources);
    if (!parsed) {
      console.warn(`${logCtx} paso 2: JSON no parseable`);
      return {
        rows: [nullRow('gemini', 'Búsqueda Gemini', 'Gemini respondió pero el JSON estructurado no se pudo parsear — revisá los logs')],
      };
    }

    // Extraemos el producto identificado por Gemini a partir de los snippets de Google.
    const product: IdentifiedProduct | undefined = parsed.producto?.nombre?.trim()
      ? {
          nombre: parsed.producto.nombre.trim(),
          presentacion: parsed.producto.presentacion?.trim() || undefined,
          fabricante: parsed.producto.fabricante?.trim() || undefined,
        }
      : undefined;

    if (parsed.farmacias.length === 0) {
      console.warn(`${logCtx} paso 2: 0 farmacias tras el parse`);
      return {
        product,
        rows: [
          nullRow(
            'gemini',
            'Búsqueda Gemini',
            'Gemini encontró referencias pero ninguna con precio identificable',
          ),
        ],
      };
    }
    console.log(`${logCtx} paso 2 OK, ${parsed.farmacias.length} farmacias, producto=${product?.nombre ?? '?'}`);

    // Anotamos cada fila con urlVerificada según si la URL está en la lista de grounding sources.
    const sourcesSet = new Set(grounded.sources.map((s) => s.uri));
    return {
      product,
      rows: parsed.farmacias.map((f, idx) => farmaciaToRow(f, idx, sourcesSet)),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${logCtx} EXCEPCIÓN: ${message}`);
    return { rows: [nullRow('gemini', 'Búsqueda Gemini', userFriendlyError(err))] };
  }
}

/** Traduce errores técnicos de Gemini a mensajes entendibles por el usuario final. */
function userFriendlyError(err: unknown): string {
  if (err instanceof GeminiUnavailableError) {
    if (err.status === 503) {
      return 'Google Gemini está saturado ahora mismo. Reintentamos automáticamente 3 veces sin éxito — probá de nuevo en 1-2 minutos.';
    }
    if (err.status === 429) {
      return 'Se alcanzó el límite de peticiones de Gemini. Esperá un minuto y volvé a intentar.';
    }
    if (err.status >= 500) {
      return 'Gemini está teniendo problemas técnicos. Reintentá en unos segundos.';
    }
    if (err.status === 400) {
      return 'La consulta a Gemini no fue aceptada (posible problema con el input). Revisá los datos y volvé a probar.';
    }
    if (err.status === 403) {
      return 'La API key de Gemini no tiene permisos suficientes (verifica billing y grounding habilitado).';
    }
    return err.message;
  }
  if (err instanceof Error) {
    if (err.name === 'AbortError') {
      return 'La búsqueda tardó demasiado (timeout). Google puede estar lento — probá de nuevo.';
    }
    return err.message;
  }
  return String(err);
}

/* Fuente extraída del groundingMetadata: URL REAL que devolvió Google (no inventada por el LLM). */
interface GroundingSource {
  uri: string;
  title?: string;
}

// ============================================================
// Paso 1: llamada con google_search grounding
// ============================================================

async function runGrounded(
  apiKey: string,
  input: GeminiSearchInput,
  forceSearch: boolean,
  model: string = MODEL_GROUNDING_PRIMARY,
): Promise<{ text: string; sources: GroundingSource[] } | null> {
  // Ignoramos el nombre si es idéntico al CN o EAN — el user solo puso el código y el
  // form propagó ese mismo valor al campo nombre; no aporta señal y confunde al modelo.
  const nombreLimpio =
    input.nombre && input.nombre !== input.cn && input.nombre !== input.ean
      ? input.nombre
      : undefined;
  const identifiers = [
    input.cn ? `Código Nacional (CN) ${input.cn}` : null,
    input.ean ? `EAN ${input.ean}` : null,
    nombreLimpio ? `nombre "${nombreLimpio}"` : null,
  ]
    .filter(Boolean)
    .join(', ');

  const mainQuery = input.cn ?? input.ean ?? nombreLimpio ?? '';
  const promptBase = `Tarea: identificar y comparar precios de un producto de farmacia/parafarmacia en farmacias online españolas.

Producto a buscar: ${identifiers}

DEBES usar la herramienta google_search para buscar el producto EN INTERNET AHORA. Realiza múltiples búsquedas:
- "${mainQuery} farmacia precio"
- "${mainQuery} comprar"
- Variaciones específicas del producto

Cada dato debe venir de un resultado real de Google. Sin resultados de Google, no respondes.

Después de las búsquedas, devuelve:

1) **PRODUCTO IDENTIFICADO** (basado en los resultados de Google):
   - Nombre completo (marca + producto + variante), ej: "Ricola Perlas Sin Azúcar Limón Melisa"
   - Presentación (formato, cantidad), ej: "25 g"
   - Fabricante si aparece

2) **PRECIOS por cada farmacia online española** donde aparezca:
   - Nombre de la farmacia
   - Precio en euros
   - URL DIRECTA de la ficha (copiada tal cual del resultado de Google)
   - Disponibilidad (en stock / agotado / desconocido)

Reglas:
- Devuelve todas las farmacias que Google encuentre (hasta 15).
- Solo farmacias españolas (.es o .com con envío a España).
- Si Google no devuelve nada real, dilo explícitamente. NO inventes.

Formato: texto natural. Empieza con "PRODUCTO IDENTIFICADO: <nombre> — <presentación> (<fabricante>)". Luego "PRECIOS:" seguido de una farmacia por línea con URL completa.`;

  // Prompt más agresivo para el retry cuando el primer intento no invocó el tool.
  const promptForce = `${promptBase}

⚠️ INSTRUCCIÓN OBLIGATORIA: en tu intento anterior no invocaste google_search. Esta vez ES INDISPENSABLE que uses google_search AL MENOS 3 VECES antes de responder. Sin ejecutar google_search, no respondas nada, di solo "búsqueda no ejecutada". NUNCA respondas basándote en conocimiento pre-entrenado.`;

  const prompt = forceSearch ? promptForce : promptBase;

  const url = `${API_BASE}/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
    },
  };

  const res = await fetchWithTimeout(url, body);
  const text = extractText(res);
  const sources = extractGroundingSources(res);
  if (!text) return null;
  return { text, sources };
}

/** Extrae las URLs reales que Google Search devolvió como fuente (groundingChunks.web).
    Estas SÍ son URLs verdaderas — a diferencia de las que Gemini pueda escribir en el texto. */
function extractGroundingSources(response: unknown): GroundingSource[] {
  const r = response as {
    candidates?: Array<{
      groundingMetadata?: {
        groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
      };
    }>;
  };
  const chunks = r.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const seen = new Set<string>();
  const out: GroundingSource[] = [];
  for (const c of chunks) {
    const uri = c.web?.uri;
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    out.push({ uri, title: c.web?.title });
  }
  return out;
}

// ============================================================
// Paso 2: parseo del texto libre a JSON estructurado
// ============================================================

async function runParse(
  apiKey: string,
  groundedText: string,
  sources: GroundingSource[],
): Promise<GeminiParsedResponse | null> {
  // Lista numerada de URLs REALES devueltas por Google Search — fuente de verdad para el parseo.
  const sourcesBlock = sources
    .map((s, i) => `[${i + 1}] ${s.uri}${s.title ? `  — ${s.title.slice(0, 80)}` : ''}`)
    .join('\n');

  const prompt = `Convierte el siguiente texto sobre un producto farmacéutico y sus precios en JSON estructurado.

REGLAS:
1. Extrae el PRODUCTO IDENTIFICADO del texto (bloque "PRODUCTO IDENTIFICADO:") en producto.nombre / presentacion / fabricante.
2. Extrae TODAS las farmacias del bloque "PRECIOS:" que tengan precio, aunque no puedas verificar la URL. No limites la cantidad.
3. Para la URL de cada farmacia:
   - Prefiere una URL EXACTA de la "Lista de URLs reales" (misma farmacia, mismo producto) → precio_confianza = "alto".
   - Si el precio se menciona pero no hay URL exacta en la lista, deja \`url\` con el dominio raíz (ej: "https://www.atida.com") y precio_confianza = "medio".
   - Si no tienes ninguna URL, pon la URL raíz de la farmacia (dominio típico: Atida = atida.com, DosFarma = dosfarma.com, etc.) y precio_confianza = "bajo".
4. NUNCA inventes URLs específicas de producto que no estén en la lista. Solo usa dominio raíz cuando no tengas URL exacta.
5. Precio como número (1.99, no "1,99 €"). Moneda "EUR" salvo indicación explícita.
6. disponibilidad: "en_stock" | "agotado" | "desconocido".

Lista de URLs reales devueltas por Google (fuente de verdad para URLs específicas):
${sourcesBlock}

Texto:
"""
${groundedText}
"""`;

  const responseSchema = {
    type: 'object',
    properties: {
      producto: {
        type: 'object',
        properties: {
          nombre: { type: 'string' },
          presentacion: { type: 'string' },
          fabricante: { type: 'string' },
          cn: { type: 'string' },
          ean: { type: 'string' },
        },
      },
      farmacias: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            nombre: { type: 'string' },
            precio: { type: 'number' },
            moneda: { type: 'string' },
            url: { type: 'string' },
            disponibilidad: {
              type: 'string',
              enum: ['en_stock', 'agotado', 'desconocido'],
            },
            precio_confianza: {
              type: 'string',
              enum: ['alto', 'medio', 'bajo'],
            },
          },
          required: ['nombre', 'precio', 'url'],
        },
      },
    },
    required: ['farmacias'],
  };

  const url = `${API_BASE}/models/${MODEL_PARSE}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.0,
      responseMimeType: 'application/json',
      responseSchema,
      maxOutputTokens: 4096,
    },
  };

  const res = await fetchWithTimeout(url, body);
  const jsonText = extractText(res);
  if (!jsonText) return null;

  try {
    const parsed = JSON.parse(jsonText) as GeminiParsedResponse;
    // Validación defensiva por si el schema no se respeta al 100%
    parsed.farmacias = (parsed.farmacias ?? []).filter(
      (f) =>
        f &&
        typeof f.nombre === 'string' &&
        f.nombre.trim() &&
        typeof f.precio === 'number' &&
        f.precio > 0 &&
        typeof f.url === 'string' &&
        /^https?:\/\//.test(f.url),
    );
    return parsed;
  } catch {
    return null;
  }
}

// ============================================================
// Helpers
// ============================================================

// Códigos HTTP transitorios que sí conviene reintentar (saturación de Gemini, rate limit,
// hiccup de red intermedio). 4xx no retryables como 400 o 403 se propagan sin reintento.
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
// Bajamos a 2 retries — más intentos alargan el tiempo total sin mejorar mucho la tasa de éxito.
// Con backoff 2s → 5s tenemos 3 intentos totales en <10s de espera acumulada.
const MAX_RETRIES = 2;
const RETRY_INITIAL_DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Error tipado para el caller — permite generar un mensaje user-friendly cuando el fallo
 * es "servidor saturado" en vez de un error genérico HTTP 503 poco entendible.
 */
class GeminiUnavailableError extends Error {
  readonly status: number;
  constructor(status: number, detail: string) {
    super(`Gemini HTTP ${status}: ${detail.slice(0, 200)}`);
    this.status = status;
    this.name = 'GeminiUnavailableError';
  }
}

async function fetchWithTimeout(url: string, body: unknown): Promise<unknown> {
  let lastErr: Error | undefined;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (res.ok) {
        clearTimeout(timer);
        return (await res.json()) as unknown;
      }

      const detail = await res.text();
      const retryable = RETRYABLE_STATUS.has(res.status);

      if (!retryable || attempt === MAX_RETRIES) {
        // Sin más intentos: propagamos error tipado con el status original.
        throw new GeminiUnavailableError(res.status, detail);
      }

      // Backoff exponencial: 1.5s, 3s, 6s. Suficiente para que Gemini se recupere de un pico.
      const delayMs = RETRY_INITIAL_DELAY_MS * 2 ** attempt;
      console.warn(
        `[gemini] HTTP ${res.status} (${res.status === 503 ? 'saturado' : 'transitorio'}), retry ${attempt + 1}/${MAX_RETRIES} tras ${delayMs}ms`,
      );
      lastErr = new GeminiUnavailableError(res.status, detail);
      await sleep(delayMs);
    } catch (err) {
      if (err instanceof GeminiUnavailableError) throw err;
      // AbortError (timeout) o network: reintentamos también, salvo último intento.
      if (attempt === MAX_RETRIES) throw err;
      const delayMs = RETRY_INITIAL_DELAY_MS * 2 ** attempt;
      console.warn(
        `[gemini] error red/timeout: ${err instanceof Error ? err.message : err}, retry ${attempt + 1}/${MAX_RETRIES} tras ${delayMs}ms`,
      );
      lastErr = err instanceof Error ? err : new Error(String(err));
      await sleep(delayMs);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr ?? new Error('Gemini: intentos agotados sin causa clara');
}

function extractText(response: unknown): string | undefined {
  const r = response as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return r.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? '')
    .join('')
    .trim();
}

function farmaciaToRow(
  f: GeminiFarmaciaResult,
  idx: number,
  sourcesSet: Set<string>,
): ComparisonRow {
  const dominio = (() => {
    try {
      return new URL(f.url).hostname.replace(/^www\./, '');
    } catch {
      return f.nombre.toLowerCase().replace(/\s+/g, '-');
    }
  })();
  const urlVerificada = sourcesSet.has(f.url);
  return {
    pharmacyId: `${dominio}-${idx}`,
    pharmacyName: f.nombre,
    // Solo exponemos productUrl si la URL está verificada — evita redirigir a URLs inventadas o rotas.
    productUrl: urlVerificada ? f.url : null,
    status: 'ok',
    precio: f.precio,
    moneda: f.moneda ?? 'EUR',
    disponibilidad: f.disponibilidad,
    urlVerificada,
    precioConfianza: f.precio_confianza,
  };
}

function nullRow(id: string, name: string, message: string): ComparisonRow {
  return {
    pharmacyId: id,
    pharmacyName: name,
    productUrl: null,
    status: 'not-found',
    errorMessage: message,
  };
}

/** True si el error es un timeout del cliente o un 5xx/429 de Gemini — vale la pena caer a flash. */
function isTransientOrTimeout(err: unknown): boolean {
  if (err instanceof GeminiUnavailableError) {
    return RETRYABLE_STATUS.has(err.status);
  }
  if (err instanceof Error) {
    return err.name === 'AbortError' || /aborted|timeout/i.test(err.message);
  }
  return false;
}

function errShort(err: unknown): string {
  if (err instanceof GeminiUnavailableError) return `HTTP ${err.status}`;
  if (err instanceof Error) return err.message.slice(0, 60);
  return String(err).slice(0, 60);
}
