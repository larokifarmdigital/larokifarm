/**
 * PharmacyPageScraper: adapter que scrapea una URL YA CONOCIDA de ficha de producto.
 *
 * Pipeline:
 *   1. Descargar HTML (unlockedFetch: fetch directo → ScraperAPI si antibot).
 *   2. Extraer precio con la cascada de strategies deterministas (JSON-LD, Shopify, etc).
 *   3. Fallback IA Gemini para HTML no reconocido.
 *   4. Escalado a render=true (JS renderizado en headless) si la primera pasada falla.
 *
 * No hace descubrimiento de URL — eso lo resuelve WebProductFinder (Google Search).
 * Loggea cada paso con prefijo `[scrape-direct DOMAIN]` para diagnóstico.
 */

import * as cheerio from 'cheerio';
import type { ComparisonRow } from '@/core/domain/models';
import type { PharmacyPageScraper } from '@/core/domain/ports/PharmacyPageScraper';
import { extractPriceViaGemini } from './geminiHtmlExtractor';
import type { Extraction } from './page/extraction';
import type { FetchHtmlResult } from './page/fetchHtml';
import { STRATEGIES } from './page/strategies';
import { unlockedFetch } from './page/unlockedFetch';

async function scrape(productUrl: string, pharmacyName: string): Promise<ComparisonRow> {
  let domain: string;
  try {
    domain = new URL(productUrl).hostname.replace(/^www\./, '');
  } catch {
    return {
      pharmacyId: 'invalid',
      pharmacyName,
      productUrl,
      status: 'not-found',
      errorMessage: 'URL inválida',
    };
  }
  const log = (msg: string) => console.log(`[scrape-direct ${domain}] ${msg}`);

  // Primera pasada sin JS render (barato)
  let attempt = await fetchAndExtract(productUrl, false, log);
  if (!attempt.ok) {
    // Segunda pasada con render=true por si es SPA
    log('sin precio sin JS → reintento con render=true');
    attempt = await fetchAndExtract(productUrl, true, log);
  }

  if (!attempt.ok) {
    return {
      pharmacyId: domain,
      pharmacyName,
      productUrl,
      status: 'not-found',
      errorMessage: 'Sin precio automático — hacé click para verificar en la ficha',
    };
  }

  return {
    pharmacyId: domain,
    pharmacyName,
    productUrl,
    status: 'ok',
    precio: attempt.extraction.precio,
    moneda: attempt.extraction.moneda,
    disponibilidad:
      attempt.extraction.enStock === true
        ? 'en_stock'
        : attempt.extraction.enStock === false
          ? 'agotado'
          : 'desconocido',
    urlVerificada: true,
    precioConfianza: attempt.via === 'strategy' ? 'alto' : 'medio',
  };
}

/**
 * Descarga HTML y corre la cascada de strategies + fallback Gemini.
 * Devuelve la extraction junto con la fuente que la produjo.
 */
async function fetchAndExtract(
  productUrl: string,
  renderJs: boolean,
  log: (msg: string) => void,
): Promise<
  | { ok: true; extraction: Extraction; via: 'strategy' | 'gemini' }
  | { ok: false; reason: string }
> {
  const label = renderJs ? 'render=true' : 'render=false';
  const fetched: FetchHtmlResult = await unlockedFetch(productUrl, { renderJs });

  if (!fetched.ok) {
    log(`fetch ${label} falló: ${fetched.error.message}`);
    return { ok: false, reason: fetched.error.message };
  }

  log(`fetch ${label} OK (${fetched.html.length} chars)`);

  const $ = cheerio.load(fetched.html);
  const ctx = { url: productUrl, html: fetched.html, $ };

  for (const strategy of STRATEGIES) {
    try {
      const hit = await strategy.run(ctx);
      if (hit) {
        log(`strategy "${strategy.name}" hit: ${hit.precio}${hit.moneda}`);
        return { ok: true, extraction: hit, via: 'strategy' };
      }
    } catch (err) {
      log(`strategy "${strategy.name}" lanzó: ${err instanceof Error ? err.message : err}`);
    }
  }

  log('ninguna strategy encontró precio → intentando Gemini fallback');
  const gemini = await extractPriceViaGemini(fetched.html, productUrl);
  if (gemini) {
    log(`Gemini extrajo precio=${gemini.precio}€`);
    return {
      ok: true,
      extraction: {
        via: 'json-ld', // marker técnico, se reetiqueta con precioConfianza=medio en el caller
        precio: gemini.precio,
        moneda: gemini.moneda,
        enStock:
          gemini.disponibilidad === 'en_stock'
            ? true
            : gemini.disponibilidad === 'agotado'
              ? false
              : undefined,
      },
      via: 'gemini',
    };
  }

  log(`Gemini tampoco encontró precio (${label})`);
  return { ok: false, reason: 'sin precio' };
}

export const pharmacyPageScraper: PharmacyPageScraper = {
  scrape,
};
