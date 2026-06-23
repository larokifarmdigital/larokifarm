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
- "cantidad" = valor de la columna UDS TAL CUAL aparece (unidades servidas totales; no
  restes la bonificación, eso lo hace el sistema).
- "precio_unitario" = precio base por unidad de la columna PVL/PRECIO (NO el precio neto
  ni el importe). Léelo de la línea facturada; nunca pongas 0 si la columna PVL tiene valor.
- "descuento" = porcentaje de la columna DTO/DESCUENTO de ESA línea (solo el número, ej.
  21 ó 21,5). Léelo SIEMPRE que la línea tenga un valor en DTO; solo pon 0 si esa columna
  está vacía. El descuento NO es la bonificación: son columnas distintas.
- "bonificacion" = valor de la columna BONIF. TAL CUAL (unidades de regalo/muestra/
  promoción de esa línea). Si no hay, 0.
- IMPORTANTE sobre bonificaciones: a veces el regalo NO va en columna BONIF. sino como
  una LÍNEA APARTE del mismo producto con precio 0 (o 100% de descuento). En ese caso
  extrae esa línea tal cual: su "cantidad" = sus unidades y "precio_unitario" = 0. NO
  la fusiones con la línea facturada; el sistema la reconocerá como bonificación.
- "codigo_nacional" = columna C.N. si existe; si no, "".
- "codigo_ean" = código de barras / EAN / código alternativo del artículo si aparece
  (solo el código, normalmente 8-13 dígitos); si no, "".
- "proveedor" = nombre del proveedor que emite el albarán (ej. "DENTAID").
- Fechas en formato YYYY-MM-DD.

FORMATOS DE TABLA — IMPORTANTE:
- Algunos proveedores (Perrigo y similares) usan CABECERAS Y FILAS APILADAS en 2
  líneas visuales: arriba "Cód. Art." / "Descripción" y debajo "Uds." / "PV" /
  "Dto" / "Precio neto" / "Importe" / "% IVA". Cada artículo ocupa también 2 líneas:
  arriba código + descripción, debajo "{uds} ST {PV} {dto} {neto} {importe} {%iva}".
  Trátalas como UNA SOLA línea de artículo, no como dos. La columna "Uds." aparece
  DEBAJO de "Cód. Art." (apilada), no a su derecha: no confundas el código con las
  unidades.
- Cuando veas la unidad "ST" (o "UN", "UDS") detrás de un número (ej. "36 ST",
  "120 ST"), la cantidad es ese número. Nunca tomes dígitos del código de artículo
  ni del EAN como cantidad.
- En la descripción pueden aparecer notaciones de envase como "2X6", "1X12",
  "6x10": son el formato del pack del proveedor, NO son cantidades, multiplicadores
  ni unidades. Ignóralas para "cantidad".
- Sanity check antes de devolver cada línea: cantidad × precio_neto debe cuadrar
  aproximadamente con el importe de la línea. Si no cuadra ni de lejos, has leído
  mal alguna columna — vuelve a mirarla.`;

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
          codigo_ean: { type: 'string' },
          descripcion: { type: 'string' },
          cantidad: { type: 'number' },
          precio_unitario: { type: 'number' },
          descuento: { type: 'number' },
          bonificacion: { type: 'number' },
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
  codigo_ean: z.string().optional(),
  descripcion: z.string(),
  cantidad: z.number(),
  precio_unitario: z.number(),
  descuento: z.number().optional(),
  bonificacion: z.number().optional(),
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
