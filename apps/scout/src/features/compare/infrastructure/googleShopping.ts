/**
 * Motor primario del comparador: Google Shopping vía ScraperAPI.
 *
 * Endpoint: https://api.scraperapi.com/structured/google/shopping
 * Doc: https://docs.scraperapi.com/making-requests/structured-data-collection-method/google-shopping-api
 *
 * Una sola llamada devuelve 10-20 farmacias con precio comparado del producto.
 * No hay que adivinar URLs ni parsear HTML — Google ya matcheó el producto y agregó
 * los precios de todas las tiendas indexadas.
 *
 * Coste aproximado: ~50 créditos ScraperAPI por búsqueda.
 */

import type { ComparisonRow } from '../domain/models';

const ENDPOINT = 'https://api.scraperapi.com/structured/google/shopping';
const REQUEST_TIMEOUT_MS = 30_000;

export interface ShoppingSearchInput {
  cn?: string;
  ean?: string;
  nombre?: string;
}

interface ShoppingResult {
  title?: string;
  price?: string;
  extracted_price?: number;
  source?: string;
  link?: string;
  rating?: number;
  reviews?: number;
  currency?: string;
  delivery?: string;
}

interface ShoppingApiResponse {
  shopping_results?: ShoppingResult[];
}

export type ShoppingSearchResult =
  | { ok: true; rows: ComparisonRow[] }
  | { ok: false; error: string };

/** Construye la query priorizando el nombre (mejor identificador para Google Shopping)
 *  y añadiendo códigos si están disponibles. */
function buildQuery(input: ShoppingSearchInput): string {
  const parts: string[] = [];
  if (input.nombre) parts.push(input.nombre);
  if (input.ean) parts.push(input.ean);
  else if (input.cn) parts.push(input.cn);
  return parts.join(' ').trim();
}

/** Normaliza un texto para comparación: minúsculas, sin puntuación, con separación
 *  entre número y letra ("50ml" → "50 ml") para que "50" y "ml" matcheen como tokens. */
function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[áàâä]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[íìîï]/g, 'i')
    .replace(/[óòôö]/g, 'o')
    .replace(/[úùûü]/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/(\d)([a-z])/g, '$1 $2')
    .replace(/([a-z])(\d)/g, '$1 $2')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Stopwords que no aportan señal al matching (artículos, preposiciones cortas). */
const MATCH_STOPWORDS = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'y', 'con', 'sin', 'para', 'en', 'por',
  'a', 'e', 'o', 'u',
]);

/** Extrae keywords significativas del query del usuario para hacer match estricto:
 *  - palabras de 2+ chars (no stopwords)
 *  - números como tokens independientes (para distinguir "50" vs "60" vs "500")
 *  - unidades: ml, g, mg, mcg, l, kg, ui, tabl, comp, caps, sobres */
function extractMatchKeywords(query: string): string[] {
  const norm = normalizeForMatch(query);
  const tokens = norm.split(' ').filter((t) => t && !MATCH_STOPWORDS.has(t));
  const keep = tokens.filter((t) => t.length >= 2 || /^\d+$/.test(t));
  return Array.from(new Set(keep));
}

/** True si el título del resultado contiene TODAS las keywords del query como tokens
 *  independientes (no substring). "50" debe aparecer como palabra, no dentro de "500". */
function titleMatchesAll(title: string, keywords: string[]): boolean {
  if (keywords.length === 0) return true;
  // Encierro con espacios para poder buscar " kw " como token independiente
  const bounded = ' ' + normalizeForMatch(title) + ' ';
  return keywords.every((kw) => bounded.includes(' ' + kw + ' '));
}

/** Convierte "15,19 €" o "€15.19" o "15.19 EUR" a { precio: 15.19, moneda: "EUR" }. */
function parsePriceString(raw: string): { precio: number; moneda: string } | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d,.]/g, '');
  if (!cleaned) return null;
  // Si tiene coma como decimal (formato europeo): "15,19"
  // Si tiene punto como decimal (formato americano): "15.19"
  // Formato mixto "1.234,56" (miles con punto): quitamos los puntos y usamos coma como decimal
  let normalized: string;
  if (/,\d{1,2}$/.test(cleaned)) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (/\.\d{1,2}$/.test(cleaned)) {
    normalized = cleaned.replace(/,/g, '');
  } else {
    normalized = cleaned.replace(',', '.');
  }
  const num = parseFloat(normalized);
  if (!Number.isFinite(num) || num <= 0) return null;
  // Detectar moneda por el string original
  const moneda = /£/.test(raw) ? 'GBP' : /\$/.test(raw) ? 'USD' : 'EUR';
  return { precio: num, moneda };
}

/** Slug corto para pharmacyId a partir del nombre de la tienda. */
function makePharmacyId(source: string | undefined, idx: number): string {
  if (source) return `${source.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${idx}`;
  return `unknown-${idx}`;
}

/** Determina si el `source` parece un dominio (ej "okfarma.es") o un nombre ("Farmacia San Pablo"). */
function looksLikeDomain(source: string): boolean {
  return /^[a-z0-9-]+(\.[a-z]{2,})+$/i.test(source.trim());
}

/**
 * Construye una URL que lleve al usuario a la ficha real del producto en la tienda.
 * Google Shopping devuelve `link` como proxy interno inservible; en su lugar armamos
 * un Google search con el título del producto restringido a la tienda:
 *   - si source es dominio: `"Fisiocrem Gel Forte 50 ml" site:okfarma.es`
 *   - si source es nombre:  `"Fisiocrem Gel Forte 50 ml" "Farmacia San Pablo"`
 * El primer resultado orgánico suele ser la ficha exacta.
 */
function buildStoreSearchUrl(title: string, source: string | undefined): string | null {
  if (!source || !title) return null;
  const cleanTitle = title.replace(/"/g, '').trim();
  const q = looksLikeDomain(source)
    ? `"${cleanTitle}" site:${source}`
    : `"${cleanTitle}" "${source}"`;
  return `https://www.google.com/search?q=${encodeURIComponent(q)}&gl=es&hl=es`;
}

export async function searchAllPharmaciesViaShopping(
  input: ShoppingSearchInput,
): Promise<ShoppingSearchResult> {
  const apiKey = process.env.SCRAPER_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'Falta SCRAPER_API_KEY en el servidor.' };
  }

  const query = buildQuery(input);
  if (!query) {
    return { ok: false, error: 'Sin datos para buscar (ni EAN, ni CN, ni nombre).' };
  }

  const params = new URLSearchParams({
    api_key: apiKey,
    query,
    country_code: 'es',
    tld: 'es',
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const logCtx = `[shopping query="${query.slice(0, 60)}"]`;

  try {
    const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
      method: 'GET',
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.warn(`${logCtx} HTTP ${res.status}: ${detail.slice(0, 200)}`);
      return { ok: false, error: `ScraperAPI Shopping HTTP ${res.status}` };
    }

    const data = (await res.json()) as ShoppingApiResponse;
    const results = data.shopping_results ?? [];

    console.log(`${logCtx} → ${results.length} shopping_results`);

    if (results.length === 0) {
      return {
        ok: false,
        error:
          'Google Shopping no devolvió resultados. Probá con el nombre comercial del producto (ej: "Fisiocrem Gel Forte 50 ml").',
      };
    }

    // Keywords estrictas del query del usuario — solo aceptamos rows cuyo título matchee todas
    const keywords = extractMatchKeywords(query);
    console.log(`${logCtx} keywords estrictas: [${keywords.join(', ')}]`);

    const allRows: ComparisonRow[] = [];
    const discarded: string[] = [];

    for (let idx = 0; idx < results.length; idx++) {
      const r = results[idx];
      const priceInfo =
        (typeof r.extracted_price === 'number' && r.extracted_price > 0
          ? { precio: r.extracted_price, moneda: r.currency ?? 'EUR' }
          : null) ?? (r.price ? parsePriceString(r.price) : null);
      if (!priceInfo) continue;

      const title = r.title ?? '';
      if (!titleMatchesAll(title, keywords)) {
        discarded.push(`${(r.source ?? '?').slice(0, 25)}: "${title.slice(0, 50)}"`);
        continue;
      }

      const pharmacyName = (r.source ?? '').trim() || 'Tienda desconocida';
      const pharmacyId = makePharmacyId(r.source, idx);
      const storeUrl = buildStoreSearchUrl(title || query, r.source);

      allRows.push({
        pharmacyId,
        pharmacyName,
        productUrl: storeUrl,
        status: 'ok',
        precio: priceInfo.precio,
        moneda: priceInfo.moneda,
        urlVerificada: true,
        precioConfianza: 'alto',
      });
    }

    console.log(
      `${logCtx} → ${allRows.length}/${results.length} matchean todas las keywords (descartados: ${discarded.length})`,
    );
    for (const d of discarded.slice(0, 5)) console.log(`  ✗ descartado: ${d}`);

    if (allRows.length === 0) {
      return {
        ok: false,
        error: `Google Shopping devolvió ${results.length} resultados pero NINGUNO coincide exactamente con "${query}". Los que aparecieron eran de otras variantes/tamaños. Probá con menos palabras (ej: solo la marca + tamaño) o revisá el nombre exacto.`,
      };
    }

    return { ok: true, rows: allRows };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, error: 'Timeout tras 30s en Google Shopping.' };
    }
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}
