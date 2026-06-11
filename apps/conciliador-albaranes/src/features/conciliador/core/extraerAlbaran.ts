import { z } from 'zod';
import type { AlbaranData } from './tipos';

/**
 * Extracción del albarán PDF con Gemini (§7). Vía `fetch` (sin SDK) para que
 * corra en el runtime de Workers. La API key se pasa explícita (viene de un
 * secret, nunca del código).
 */

const MODELO = 'gemini-2.5-flash';

const PROMPT = `Eres un extractor de albaranes de proveedores farmacéuticos.
Vienen en muchos formatos; adáptate. Extrae cabecera y TODAS las líneas
(puede haber varias páginas: no te dejes ninguna).
- "cantidad" = unidades servidas (UDS).
- "precio_unitario" = precio base por unidad (ej. PVL/PRECIO).
- "descuento" = porcentaje de la columna DTO (solo el número, ej. 21). Si no hay, 0.
- "codigo_nacional" = columna C.N. si existe; si no, "".
- "proveedor" = nombre del proveedor que emite el albarán (ej. "DENTAID").
- Fechas en formato YYYY-MM-DD.`;

// Schema que se le pasa a Gemini para forzar la salida (OpenAPI subset).
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    numero_albaran: { type: 'string' },
    proveedor: { type: 'string' },
    fecha: { type: 'string' },
    numero_pedido: { type: 'string' },
    lineas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          codigo: { type: 'string' },
          codigo_nacional: { type: 'string' },
          descripcion: { type: 'string' },
          cantidad: { type: 'number' },
          precio_unitario: { type: 'number' },
          descuento: { type: 'number' },
        },
        required: ['descripcion', 'cantidad', 'precio_unitario'],
      },
    },
  },
  required: ['numero_albaran', 'lineas'],
} as const;

// Validación de la respuesta (defensa ante el LLM).
const lineaSchema = z.object({
  codigo: z.string().optional(),
  codigo_nacional: z.string().optional(),
  descripcion: z.string(),
  cantidad: z.number(),
  precio_unitario: z.number(),
  descuento: z.number().optional(),
});
const albaranSchema = z.object({
  numero_albaran: z.string(),
  proveedor: z.string().optional(),
  fecha: z.string().optional(),
  numero_pedido: z.string().optional(),
  lineas: z.array(lineaSchema),
});

export interface ExtraerOpciones {
  apiKey: string;
  /** Permite inyectar un fetch (tests / runtime). Por defecto el global. */
  fetchImpl?: typeof fetch;
}

/** Envía el PDF (base64) a Gemini y devuelve el albarán estructurado. */
export async function extraerAlbaran(
  pdfBase64: string,
  { apiKey, fetchImpl = fetch }: ExtraerOpciones,
): Promise<AlbaranData> {
  if (!apiKey) throw new Error('Falta GEMINI_API_KEY');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`;
  const body = {
    contents: [
      {
        parts: [
          { text: PROMPT },
          { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detalle = await res.text().catch(() => '');
    throw new Error(`Gemini ${res.status}: ${detalle.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const texto = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!texto) throw new Error('Gemini: respuesta vacía o sin texto');

  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch {
    throw new Error('Gemini: la salida no es JSON válido');
  }

  const parsed = albaranSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(`Gemini: salida con formato inesperado — ${parsed.error.message}`);
  }
  return parsed.data;
}
