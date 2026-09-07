/**
 * Fallback: cuando las strategies deterministas (JSON-LD, microdata, OG, Shopify, Prestashop)
 * NO encuentran precio en la ficha, pasamos el HTML limpio a Gemini para que lo extraiga.
 *
 * Uso puntual: no es el motor principal — solo se dispara si la cascada falla. Barato porque
 * pasa un HTML ya recortado a lo relevante y usa gemini-2.5-flash con schema estructurado.
 */

import * as cheerio from 'cheerio';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL = 'gemini-2.5-flash';
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_HTML_CHARS = 20_000;

export interface HtmlExtractionResult {
  precio: number;
  moneda: string;
  disponibilidad?: 'en_stock' | 'agotado' | 'desconocido';
  nombre?: string;
}

/** Reduce el HTML al texto útil: quita scripts/styles y colapsa espacios. */
function cleanHtml(html: string): string {
  const $ = cheerio.load(html);
  $('script, style, noscript, svg, iframe, link, meta').remove();
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  return text.slice(0, MAX_HTML_CHARS);
}

export async function extractPriceViaGemini(
  html: string,
  url: string,
): Promise<HtmlExtractionResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const cleaned = cleanHtml(html);
  if (!cleaned) return null;

  const prompt = `Del siguiente texto extraído de la ficha de producto de una farmacia online, extrae el precio de venta actual.

URL: ${url}

REGLAS:
- Precio como número (ej: 12.95), sin símbolo de moneda.
- Moneda "EUR" salvo indicación contraria.
- Si hay precio original tachado + precio con descuento, devuelve el precio con descuento (el que paga el cliente).
- disponibilidad: "en_stock" si el producto se puede comprar, "agotado" si aparece "sin stock/agotado/no disponible", "desconocido" en otro caso.
- Si no hay precio claramente identificable, devuelve precio 0.

Texto:
"""
${cleaned}
"""`;

  const responseSchema = {
    type: 'object',
    properties: {
      precio: { type: 'number' },
      moneda: { type: 'string' },
      disponibilidad: {
        type: 'string',
        enum: ['en_stock', 'agotado', 'desconocido'],
      },
      nombre: { type: 'string' },
    },
    required: ['precio', 'moneda'],
  };

  const endpoint = `${API_BASE}/models/${MODEL}:generateContent?key=${apiKey}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.0,
          responseMimeType: 'application/json',
          responseSchema,
          maxOutputTokens: 512,
        },
      }),
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim();
    if (!text) return null;

    const parsed = JSON.parse(text) as HtmlExtractionResult;
    if (typeof parsed.precio !== 'number' || parsed.precio <= 0) return null;
    return {
      precio: parsed.precio,
      moneda: parsed.moneda || 'EUR',
      disponibilidad: parsed.disponibilidad,
      nombre: parsed.nombre,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
