import { z } from 'zod';
import type { AlbaranData } from './tipos';

/**
 * Extracción del albarán PDF con Gemini (§7). Vía `fetch` (sin SDK) para que
 * corra en el runtime de Workers. La API key se pasa explícita (viene de un
 * secret, nunca del código).
 */

const MODELO = 'gemini-2.5-flash';

const PROMPT = `Eres un extractor de albaranes y facturas de proveedores farmacéuticos.
Vienen en muchos formatos; adáptate. Extrae cabecera y TODAS las líneas
(puede haber varias páginas: no te dejes ninguna).

- "tipo_documento" = clasifica el PDF según su cabecera/título:
    "albaran"  si aparece "ALBARÁN", "ALBARÁN DE ENTREGA", "DELIVERY NOTE", etc.
    "factura"  si aparece "FACTURA", "INVOICE", "Nº Factura", etc.
    "otro"     si no es claro.
  Este campo es OBLIGATORIO.

- "cantidad" = valor de la columna UDS TAL CUAL aparece (unidades servidas totales; no
  restes la bonificación, eso lo hace el sistema).
- "precio_unitario" = precio base por unidad de la columna PVL/PRECIO/Tarifa General (NO el
  precio neto ni el importe). Léelo de la línea facturada; nunca pongas 0 si la columna
  PVL/Tarifa tiene valor. Si el PDF SOLO trae precio neto (sin tarifa base), usa el neto
  como precio_unitario.
- ATENCIÓN CRÍTICA al DENOMINADOR del precio: algunos proveedores (PEROXFARMA es un
  ejemplo) muestran un precio aparentemente "por unidad" en la fila principal, pero
  añaden una línea aclaratoria del tipo "TARIFA GENERAL 37,18 € / 100 Un." (o "/ 1 Un.",
  "/ 6 Un.", "/12 UN", etc.) que indica el verdadero número de unidades de referencia
  del precio. Cuando ese denominador N sea distinto de 1, DEBES dividir el precio por N
  para devolver el precio por UNA unidad. Ejemplos:
    "37,18 € / 100 Un." → precio_unitario = 0,3718
    "3,42 € / 1 Un."    → precio_unitario = 3,42 (sin dividir, N=1)
    "60,00 € / 6 UN"    → precio_unitario = 10,00
  La misma regla aplica al precio neto, al PVL y a cualquier otro precio del documento.
  Si NO ves una línea aclaratoria con denominador, asume N=1 y deja el precio como está.
- "descuento" = porcentaje de descuento de ESA línea (solo el número, ej. 21 ó 21,5).
  El descuento NO es la bonificación: son cosas distintas.
- IMPORTANTE sobre descuentos compuestos: algunos proveedores (ej. Nestlé) aplican
  VARIOS descuentos % a la misma línea en filas separadas ("Descuento del 20.00%",
  "Descuento del 1.50%"). En ese caso devuelve la SUMA de los porcentajes explícitos
  (20 + 1,5 = 21,5). Las filas que digan solo "Descuento" sin % son ajustes financieros
  adicionales: IGNÓRALAS para "descuento". Si solo hay un único % de descuento por
  línea, devuelve ese número tal cual.
- "bonificacion" = valor de la columna BONIF. TAL CUAL (unidades de regalo/muestra/
  promoción de esa línea). Si no hay, 0.
- IMPORTANTE sobre bonificaciones: a veces el regalo NO va en columna BONIF. sino como
  una LÍNEA APARTE del mismo producto con precio 0 (o 100% de descuento). En ese caso
  extrae esa línea tal cual: su "cantidad" = sus unidades y "precio_unitario" = 0. NO
  la fusiones con la línea facturada; el sistema la reconocerá como bonificación.
- "codigo_nacional" = columna C.N. (Código Nacional español, formato XXXXXX.X o similar)
  si existe; si no, "".
- "codigo_ean" = código de barras / EAN / GTIN del artículo si aparece (solo el código,
  normalmente 8-13 dígitos); si no, "".
- "codigo" = código interno del proveedor (ej. "UN14080", "12578223", "5000036689").
  Es el identificador que el proveedor usa internamente y suele aparecer en TODOS los
  documentos del mismo envío (albarán + factura). NO lo confundas con C.N. ni EAN.
- "proveedor" = nombre del proveedor que emite el documento (ej. "DENTAID", "NESTLÉ",
  "PEROXFARMA").
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
- Sanity check OBLIGATORIO antes de devolver cada línea:
  cantidad × precio_unitario × (1 − descuento/100) ≈ importe_de_la_linea.
  Si no cuadra ni de lejos (orden de magnitud mal), has leído mal alguna columna o
  no aplicaste el denominador del precio: vuelve a mirarla. Esto es especialmente
  importante cuando el resultado se desvía en factor 10, 100 o 1000 — suele ser
  señal de que el precio venía "por N unidades" y no lo dividiste.`;

// Schema que se le pasa a Gemini para forzar la salida (OpenAPI subset).
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    numero_albaran: { type: 'string' },
    proveedor: { type: 'string' },
    fecha: { type: 'string' },
    numero_pedido: { type: 'string' },
    tipo_documento: { type: 'string', enum: ['albaran', 'factura', 'otro'] },
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
  tipo_documento: z.enum(['albaran', 'factura', 'otro']).optional(),
  lineas: z.array(lineaSchema),
});

export interface ExtraerOpciones {
  apiKey: string;
  /** Permite inyectar un fetch (tests / runtime). Por defecto el global. */
  fetchImpl?: typeof fetch;
}

export interface UsageMetadata {
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
}

export interface ExtraerResultado {
  data: AlbaranData;
  usage: UsageMetadata;
}

/** Envía el PDF (base64) a Gemini y devuelve el albarán estructurado + tokens usados. */
export async function extraerAlbaran(
  pdfBase64: string,
  { apiKey, fetchImpl = fetch }: ExtraerOpciones,
): Promise<ExtraerResultado> {
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
    throw new Error(mensajeErrorGemini(res.status, detalle));
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
    };
  };
  const texto = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!texto) {
    throw new Error(
      'El servicio de IA no devolvió respuesta para este PDF. Vuelve a intentarlo en unos segundos.',
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch {
    throw new Error(
      'El servicio de IA devolvió una respuesta corrupta. Vuelve a intentarlo; si persiste, avisa al administrador.',
    );
  }

  const parsed = albaranSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(
      'El servicio de IA devolvió datos en un formato inesperado. Es probable que el PDF tenga un formato muy poco habitual; avisa al administrador adjuntando el archivo.',
    );
  }

  const usage: UsageMetadata = {
    promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
    candidatesTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
    totalTokens: data.usageMetadata?.totalTokenCount ?? 0,
  };

  return { data: parsed.data, usage };
}

/**
 * Traduce los errores HTTP de la API de Gemini a mensajes que el cliente
 * pueda entender. La respuesta de Gemini suele ser un JSON con
 * `{error: {code, message, status}}`; lo parseamos para extraer el mensaje
 * solo cuando aporta contexto útil; en el resto de casos damos un mensaje
 * fijo en español orientado a la acción que el usuario puede hacer.
 */
function mensajeErrorGemini(status: number, detalle: string): string {
  // Mensaje original de Gemini (si viene), por si lo añadimos como pista.
  let geminiMsg = '';
  try {
    const j = JSON.parse(detalle) as { error?: { message?: string } };
    geminiMsg = j.error?.message ?? '';
  } catch {
    /* no es JSON: ignoramos */
  }

  switch (status) {
    case 400:
      return 'No se pudo leer el PDF: puede estar dañado, protegido con contraseña o tener un formato no soportado. Comprueba el archivo y vuelve a intentarlo.';
    case 401:
    case 403:
      return 'No se pudo autenticar con el servicio de IA. Avisa al administrador para que revise la configuración (clave de API).';
    case 404:
      return 'El servicio de IA no está disponible. Avisa al administrador para que revise la configuración.';
    case 413:
      return 'El PDF es demasiado grande para procesarlo. Prueba con un archivo más pequeño (idealmente menos de 20 MB).';
    case 429:
      return 'Demasiadas peticiones a la vez al servicio de IA. Espera unos segundos y vuelve a intentarlo.';
    case 500:
      return 'El servicio de IA tuvo un error interno. Vuelve a intentarlo en uno o dos minutos.';
    case 503:
      return 'El servicio de IA está saturado por mucha demanda (es algo temporal). Espera 1-2 minutos y pulsa "Comparar" otra vez.';
    case 504:
      return 'El PDF está tardando demasiado en procesarse. Si tiene muchas páginas, divídelo o vuelve a intentarlo.';
    default: {
      const pista = geminiMsg ? ` (${geminiMsg.slice(0, 140)})` : '';
      return `Error inesperado al contactar con el servicio de IA (HTTP ${status})${pista}. Vuelve a intentarlo.`;
    }
  }
}
