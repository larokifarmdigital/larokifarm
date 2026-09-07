/**
 * Adapter Google Search Web vía ScraperAPI.
 * Busca el producto en Google Search normal (no Shopping) para encontrar farmacias
 * indexadas que NO participan de Google Merchant Center (ej: DosFarma, Atida, PromoFarma).
 *
 * Complementa googleShopping.ts en el motor híbrido: Shopping cubre las tiendas que
 * suben feed a Merchant Center; Web Search cubre TODAS las páginas indexadas.
 *
 * Endpoint: https://api.scraperapi.com/structured/google/search
 * Reutiliza el mismo helper resolveGotoUrl del pipeline generic para desenvolver
 * los links wrappeados del SERP mobile de google.es.
 */

import type {
  WebProductFinder,
  WebProductHit,
} from '@/core/domain/ports/WebProductFinder';
import { resolveGotoUrl } from '../scraper/googleGotoResolver';

const ENDPOINT = 'https://api.scraperapi.com/structured/google/search';
const REQUEST_TIMEOUT_MS = 20_000;

interface GoogleOrganic {
  title?: string;
  link?: string;
  snippet?: string;
  displayed_link?: string;
}

interface GoogleSearchResponse {
  organic_results?: GoogleOrganic[];
}

/** Dominios que NO son farmacias (marketplaces genéricos, redes sociales, buscadores…). */
const EXCLUDED_DOMAINS = [
  'google.',
  'youtube.com',
  'facebook.com',
  'instagram.com',
  'twitter.com',
  'x.com',
  'tiktok.com',
  'wikipedia.org',
  'wikimedia.org',
  'amazon.',
  'ebay.',
  'aliexpress.',
  'milanuncios.com',
  'wallapop.com',
  'idealista.com',
  'yelp.',
  'tripadvisor.',
  'reddit.com',
  'quora.com',
  'linkedin.com',
  'pinterest.',
  'gstatic.com',
  'googleusercontent.com',
];

function isExcludedDomain(domain: string): boolean {
  return EXCLUDED_DOMAINS.some((bad) => domain.includes(bad));
}

function isGoogleRedirect(url: string): boolean {
  return /^https?:\/\/(?:www\.)?google\.[^/]+\/(?:goto|url|aclk)\?/i.test(url);
}

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

/** Convierte un breadcrumb tipo "www.atida.com › es-es › fisiocrem-gel-forte-50-ml"
 *  en URL completa. Devuelve null si el breadcrumb está truncado con "..." o "…". */
function displayedLinkToUrl(displayed: string): string | null {
  if (!displayed) return null;
  const parts = displayed.split(/\s*›\s*|\s*>\s*/).map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.some((p) => /(\.{3}|…)/.test(p))) return null;
  const host = parts[0].replace(/^https?:\/\//i, '');
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(host)) return null;
  const path = parts.slice(1).join('/');
  const url = path ? `https://${host}/${path}` : `https://${host}`;
  try {
    new URL(url);
    return url;
  } catch {
    return null;
  }
}

/** Resuelve un hit a una URL usable: intenta link directo → displayed_link → resolveGoto. */
async function resolveHit(o: GoogleOrganic): Promise<{ url: string; title: string } | null> {
  if (!o.title) return null;

  // 1. link directo, sin wrapper
  if (o.link && !isGoogleRedirect(o.link)) {
    return { url: o.link, title: o.title };
  }

  // 2. displayed_link como breadcrumb (barato)
  if (o.displayed_link) {
    const fromDisplayed = displayedLinkToUrl(o.displayed_link);
    if (fromDisplayed) return { url: fromDisplayed, title: o.title };
  }

  // 3. Fetch al goto para desenvolver (más caro, 1 HTTP extra)
  if (o.link && isGoogleRedirect(o.link)) {
    const resolved = await resolveGotoUrl(o.link);
    if (resolved) return { url: resolved, title: o.title };
  }

  return null;
}

/**
 * Busca el producto en Google Web. Devuelve máx N farmacias únicas por dominio,
 * excluyendo marketplaces genéricos y sitios no-comerciales.
 */
async function findPharmacies(query: string, maxDomains = 8): Promise<WebProductHit[]> {
  const apiKey = process.env.SCRAPER_API_KEY;
  if (!apiKey) {
    console.warn('[webSearch] Falta SCRAPER_API_KEY');
    return [];
  }

  const params = new URLSearchParams({
    api_key: apiKey,
    query,
    country_code: 'es',
    tld: 'es',
    num: '20',
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
      method: 'GET',
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`[webSearch] HTTP ${res.status}`);
      return [];
    }

    const data = (await res.json()) as GoogleSearchResponse;
    const organics = data.organic_results ?? [];
    console.log(`[webSearch] "${query.slice(0, 50)}" → ${organics.length} organic_results`);

    // Resolvemos en paralelo los top 10 (para no gastar en resolveGoto de todos)
    const resolved = await Promise.all(organics.slice(0, 10).map(resolveHit));

    // Dedup por dominio, saltando marketplaces/redes/etc
    const seen = new Set<string>();
    const out: WebProductHit[] = [];
    for (const r of resolved) {
      if (!r) continue;
      const domain = extractDomain(r.url);
      if (!domain || isExcludedDomain(domain) || seen.has(domain)) continue;
      seen.add(domain);
      out.push({ domain, url: r.url, title: r.title });
      if (out.length >= maxDomains) break;
    }

    console.log(`[webSearch] → ${out.length} dominios únicos de farmacia`);
    return out;
  } catch (err) {
    console.warn(`[webSearch] error: ${err instanceof Error ? err.message : err}`);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export const googleWebFinder: WebProductFinder = {
  findPharmacies,
};
