/**
 * Motor genérico de scraping para UNA farmacia. Pipeline:
 *   1. Descubrir URL de ficha del producto en el dominio (Google via ScraperAPI, cascada de queries).
 *   2. Descargar HTML de esa ficha (unlockedFetch: fetch directo → ScraperAPI si antibot).
 *   3. Extraer precio con la cascada de strategies deterministas.
 *   4. Si ninguna strategy encontró precio → fallback a Gemini como extractor de HTML.
 *   5. Si aún nada → escalado a render=true (JS renderizado en headless) y repetimos 3+4.
 *
 * Sin adapters específicos por farmacia: funciona con cualquier dominio.
 * Loggea cada paso con prefijo `[scrape ...]` para diagnóstico en la terminal del server.
 */

import * as cheerio from 'cheerio';
import { unlockedFetch } from '@/shared/lib/scraping/unlockedFetch';
import { STRATEGIES } from '@/shared/lib/scraping/strategies';
import type { FetchHtmlResult } from '@/shared/lib/scraping/fetchHtml';
import type { Extraction } from '@/shared/lib/scraping/domain/Extraction';
import type { ComparisonRow } from '../../domain/models';
import {
  discoverProductUrl,
  extractDomain,
  resolveGotoUrl,
  type DiscoverInput,
} from './googleSearch';
import { extractPriceViaGemini } from './geminiHtmlExtractor';

export interface ScrapePharmacyInput {
  /** URL base del dominio de la farmacia (ej: "https://www.atida.com" o "atida.com"). */
  pharmacyUrl: string;
  cn?: string;
  ean?: string;
  nombre?: string;
}

/** Ejecuta el pipeline completo sobre una URL de farmacia. Nunca lanza — todo error → row not-found. */
export async function scrapePharmacy(input: ScrapePharmacyInput): Promise<ComparisonRow> {
  const domain = extractDomain(input.pharmacyUrl);
  if (!domain) {
    return errorRow(input.pharmacyUrl, `URL inválida: "${input.pharmacyUrl}"`);
  }

  const log = (msg: string) => console.log(`[scrape ${domain}] ${msg}`);
  const pharmacyId = domain;
  const pharmacyName = domain;

  // Paso 1: descubrir URL del producto vía Google (cascada de queries)
  const discover = await discoverProductUrl({
    domain,
    cn: input.cn,
    ean: input.ean,
    nombre: input.nombre,
  } satisfies DiscoverInput);

  log(`discovery: ${discover.attemptsLog.length} intento(s)`);
  for (const attempt of discover.attemptsLog) log(`  · ${attempt}`);

  if (!discover.ok) {
    return errorRow(null, discover.error, pharmacyId, pharmacyName);
  }

  if (discover.hits.length === 0) {
    return errorRow(
      null,
      'Google no encontró el producto en este dominio',
      pharmacyId,
      pharmacyName,
    );
  }

  const keywords = extractKeywords(input);
  log(`keywords: [${keywords.join(', ')}]`);

  // Rankeamos los hits (con URL derivada) por score
  const scoredHits = discover.hits
    .map((h) => ({ hit: h, score: scoreUrl(h.link, keywords) }))
    .sort((a, b) => b.score - a.score);
  for (const { hit, score } of scoredHits.slice(0, 5)) log(`  score=${score} → ${hit.link}`);

  const bestHit = scoredHits[0]?.hit ?? discover.hits[0];

  // Si el hit ganador tiene un goto crudo, lo resolvemos para tener la URL "verdadera" que
  // Google indexó (en Prestashop suele ser /NNNN-slug.html, no la SEO-friendly del breadcrumb).
  // Si la URL resuelta difiere de la del breadcrumb → preferimos la resuelta.
  let productUrl = bestHit.link;
  if (bestHit.gotoLink) {
    const resolved = await resolveGotoUrl(bestHit.gotoLink);
    if (resolved && resolved !== bestHit.link) {
      log(`URL breadcrumb vs URL real difieren, usando URL real:`);
      log(`  breadcrumb: ${bestHit.link}`);
      log(`  real:       ${resolved}`);
      productUrl = resolved;
    }
  }

  log(`URL elegida: ${productUrl}`);

  // Paso 2+3: fetch + strategies (primera pasada, sin JS render)
  let extraction: Extraction | null = null;
  let extractedVia: 'strategy' | 'gemini' | null = null;

  const attempt1 = await fetchAndExtract(productUrl, false, log);
  if (attempt1.ok) {
    extraction = attempt1.extraction;
    extractedVia = attempt1.via;
  }

  // Paso 5: escalado a render=true si la primera pasada no encontró precio
  if (!extraction) {
    log('sin precio en pasada estándar → reintento con render=true (JS)');
    const attempt2 = await fetchAndExtract(productUrl, true, log);
    if (attempt2.ok) {
      extraction = attempt2.extraction;
      extractedVia = attempt2.via;
    }
  }

  if (!extraction) {
    return errorRow(
      productUrl,
      'No se pudo extraer precio (strategies + Gemini + render=true)',
      pharmacyId,
      pharmacyName,
    );
  }

  log(`OK precio=${extraction.precio}€ vía ${extractedVia}`);
  return {
    pharmacyId,
    pharmacyName,
    productUrl,
    status: 'ok',
    precio: extraction.precio,
    moneda: extraction.moneda,
    disponibilidad:
      extraction.enStock === true
        ? 'en_stock'
        : extraction.enStock === false
          ? 'agotado'
          : 'desconocido',
    urlVerificada: true,
    precioConfianza: extractedVia === 'strategy' ? 'alto' : 'medio',
  };
}

/**
 * Extrae el precio de una URL de ficha ya conocida (skip discovery).
 * Usado por el motor híbrido: Google Web Search ya nos dio la URL de la ficha,
 * solo hace falta fetch + strategies + fallback.
 *
 * Nunca lanza — todo error se traduce a ComparisonRow con status='not-found'.
 * Aún así devuelve la row con productUrl para que el usuario tenga el link, aunque
 * no hayamos podido extraer el precio.
 */
export async function scrapeProductPageDirect(
  productUrl: string,
  pharmacyName: string,
): Promise<ComparisonRow> {
  let domain: string;
  try {
    domain = new URL(productUrl).hostname.replace(/^www\./, '');
  } catch {
    return errorRow(productUrl, 'URL inválida', 'invalid', pharmacyName);
  }
  const log = (msg: string) => console.log(`[scrape-direct ${domain}] ${msg}`);

  // Primera pasada sin JS render
  let attempt = await fetchAndExtract(productUrl, false, log);
  if (!attempt.ok) {
    // Segunda pasada con render=true por si es SPA
    log('sin precio sin JS → reintento con render=true');
    attempt = await fetchAndExtract(productUrl, true, log);
  }

  if (!attempt.ok) {
    // Devolvemos row con URL pero sin precio — el usuario puede hacer click y verificar
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

/** Extrae keywords significativas del input del usuario (nombre + forma + tamaño)
 *  para hacer scoring del hit más probable. Incluye números (50, 100) y sufijos (ml, mg). */
function extractKeywords(input: ScrapePharmacyInput): string[] {
  const source = [input.nombre, input.ean, input.cn].filter(Boolean).join(' ');
  if (!source) return [];
  const words = source
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúüñ\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2);
  return Array.from(new Set(words));
}

/** Score una URL según qué tanto se parece a la ficha del producto buscado.
 *  Prefiere URLs con keywords en el path, penaliza páginas de marca/categoría/listado. */
function scoreUrl(url: string, keywords: string[]): number {
  let score = 0;
  let path: string;
  let segments: string[];
  try {
    const parsed = new URL(url);
    path = parsed.pathname.toLowerCase();
    segments = path.split('/').filter(Boolean);
  } catch {
    return -100;
  }

  // +3 por cada keyword del producto que aparece en el path
  for (const kw of keywords) {
    if (kw && path.includes(kw)) score += 3;
  }

  // Penalizaciones fuertes por segmentos de listado/categoría
  const listaSegments = /^(marca|marcas|brand|brands|categoria|categoria?s?|category|categories|tag|tags|blog|noticias|search|buscar|resultado|resultados|autor|author|cesta|carrito|cart|checkout|login|cuenta|account)$/i;
  for (const seg of segments) {
    if (listaSegments.test(seg)) score -= 10;
  }

  // Penalización si el path parece raíz de marca (1 solo segmento corto tipo "/fisiocrem")
  if (segments.length === 1 && segments[0].length < 20 && !/[\d-]{2,}/.test(segments[0])) {
    score -= 5;
  }

  // Bonus si el último segmento parece slug de ficha (contiene números + guiones + unidad)
  const lastSeg = segments[segments.length - 1] ?? '';
  if (/\d+.*(ml|mg|g|caps|comp|sobres?|tabl)/i.test(lastSeg)) score += 4;
  if (/-\d+-/.test(lastSeg) || /^\d+-/.test(lastSeg)) score += 2; // prefijo numérico (Prestashop)
  if (/\.html?$/i.test(lastSeg)) score += 1;

  // Bonus modesto por profundidad razonable (fichas suelen tener 2-4 segmentos)
  if (segments.length >= 2 && segments.length <= 5) score += 1;

  return score;
}

function errorRow(
  url: string | null,
  message: string,
  id?: string,
  name?: string,
): ComparisonRow {
  return {
    pharmacyId: id ?? url ?? 'unknown',
    pharmacyName: name ?? url ?? 'Farmacia',
    productUrl: null,
    status: 'not-found',
    errorMessage: message,
  };
}
