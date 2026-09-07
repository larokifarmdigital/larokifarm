/**
 * Adapter Google Search vía ScraperAPI (Structured Data Endpoint).
 * Descubre la URL de un producto dentro de un dominio de farmacia usando el operador `site:`.
 *
 * Endpoint: https://api.scraperapi.com/structured/google/search
 * Doc: https://docs.scraperapi.com/making-requests/structured-data-collection-method/google-search-api
 * Free tier: 5.000 créditos en trial + 1.000/mes permanentes (misma API key que unlockedFetch).
 *
 * Un solo proveedor (ScraperAPI) para descubrir URLs Y descargar HTML — un solo billing
 * para el cliente, una sola API key en el entorno.
 *
 * Estrategia de queries en cascada: si la más específica no devuelve hits, relajamos
 * la query hasta encontrar algo (evita el falso negativo típico de "site:X CN nombre"
 * donde Google no encuentra la conjunción exacta).
 */

const SCRAPERAPI_GOOGLE_ENDPOINT = 'https://api.scraperapi.com/structured/google/search';
const REQUEST_TIMEOUT_MS = 20_000;

export interface SearchHit {
  title: string;
  /** URL usable (derivada de displayed_link, unwrap, o goto resuelto). */
  link: string;
  snippet?: string;
  /** URL cruda del goto de Google si existe — la usamos como "fuente de verdad"
   *  cuando displayed_link produjo un URL sospechoso (ej: breadcrumb de categoría). */
  gotoLink?: string;
}

export interface DiscoverInput {
  domain: string;
  cn?: string;
  ean?: string;
  nombre?: string;
}

export type DiscoverResult =
  | { ok: true; hits: SearchHit[]; queryUsed: string; attemptsLog: string[] }
  | {
      ok: false;
      error: string;
      attemptsLog: string[];
      /** true si Google devolvió resultados en la web pero NINGUNO del dominio pedido.
       *  Señal fuerte: el producto existe pero esta farmacia no lo tiene en catálogo. */
      existsInWebButNotInDomain: boolean;
    };

interface ScraperApiOrganic {
  title?: string;
  link?: string;
  snippet?: string;
}

interface ScraperApiSearchResponse {
  organic_results?: ScraperApiOrganic[];
}

/** Extrae el hostname limpio (sin www, sin protocolo, sin path) de una URL. */
export function extractDomain(rawUrl: string): string | null {
  try {
    const u = new URL(rawUrl.trim().startsWith('http') ? rawUrl.trim() : `https://${rawUrl.trim()}`);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Limpia caracteres que Google interpreta como operadores especiales ("+" = required,
 * "&" = literal, etc.). El "+" en "Donna Plus+" hace que Google trate el término como
 * operador y rompe el `site:` filter.
 */
function sanitizeForGoogle(text: string): string {
  return text
    .replace(/[+&|"'`~*<>()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Reduce el nombre técnico de CIMA a su "nombre comercial" — quita dosis, forma
 * farmacéutica y stopwords para que la query matchee cómo las fichas comerciales
 * de las farmacias titulan el producto.
 *
 * Ej: "VIRLIX PLUS COMPRIMIDOS DE LIBERACION PROLONGADA" → "VIRLIX PLUS"
 *     "OMEPRAZOL CINFA 20 MG CAPSULAS DURAS EFG"          → "OMEPRAZOL CINFA"
 */
function shortenNombre(nombre: string): string {
  const stop =
    /^(comprimidos?|caps?|capsulas?|tabletas?|sobres?|solucion|suspension|jarabe|inyectable|liberacion|prolongada|recubiertos?|recubierto|efervescentes?|orodispersables?|masticables?|bucodispersables?|gotas?|pomada|crema|gel|colirio|spray|nasal|oral|topico|vaginal|rectal|inhalador|polvo|mg|mcg|ug|ml|g|kg|ui|de|del|la|el|los|las|y|con|sin|para|en|uso|via)$/i;
  const words = nombre
    .split(/\s+/)
    .filter((w) => w && !stop.test(w) && !/^\d/.test(w) && !/^\d+\/\d+/.test(w));
  return words.slice(0, 3).join(' ');
}

/**
 * Construye la lista de queries a probar, de más específica a más genérica.
 * Google es estricto con `site:` + múltiples términos AND: si el CN no aparece
 * literal en el HTML, "CN nombre site:X" devuelve 0. Por eso probamos variantes.
 */
function buildQueryCascade(input: DiscoverInput): string[] {
  const cascade: string[] = [];
  const site = `site:${input.domain}`;
  const nombreLimpio = input.nombre ? sanitizeForGoogle(input.nombre) : '';
  const nombreCorto = nombreLimpio ? shortenNombre(nombreLimpio) : '';
  // Google es MUY estricto con `site:` + múltiples términos: si añades 2+ palabras clave
  // y Google no encuentra los términos exactos, devuelve 0. La primera palabra suele ser
  // la marca (Fisiocrem, Bioderma…) y con site: da resultados amplios que luego elegimos.
  const marca = nombreCorto ? nombreCorto.split(/\s+/)[0] : '';

  // 1. Todo junto (más específico) — solo si tenemos identificador + nombre
  const hasIdentifier = Boolean(input.ean || input.cn);
  if (hasIdentifier && nombreLimpio) {
    const id = input.ean ?? input.cn!;
    cascade.push(`${id} ${nombreLimpio} ${site}`);
  }

  // 2. Solo EAN + site
  if (input.ean) cascade.push(`${input.ean} ${site}`);

  // 3. Solo CN + site
  if (input.cn) cascade.push(`${input.cn} ${site}`);

  // 4. Nombre CORTO + site
  if (nombreCorto) cascade.push(`${nombreCorto} ${site}`);

  // 5. Nombre completo (limpio) + site
  if (nombreLimpio && nombreLimpio !== nombreCorto) cascade.push(`${nombreLimpio} ${site}`);

  // 6. SOLO MARCA (primera palabra) + site — más permisiva, casi siempre trae hits del dominio
  if (marca && marca !== nombreCorto) cascade.push(`${marca} ${site}`);

  // 7. Último recurso: nombre corto sin site: (detecta si existe en la web)
  if (nombreCorto) cascade.push(nombreCorto);

  return Array.from(new Set(cascade));
}

/** Filtra los hits para que solo queden URLs del dominio esperado. */
function filterByDomain(hits: SearchHit[], domain: string): SearchHit[] {
  const target = domain.toLowerCase();
  return hits.filter((h) => {
    try {
      return new URL(h.link).hostname.toLowerCase().replace(/^www\./, '').endsWith(target);
    } catch {
      return false;
    }
  });
}

/** Los organic_results de ScraperAPI a veces traen displayed_link con la URL real
 *  cuando `link` viene envuelto en google.es/goto (mobile SERP). Aceptamos todas las
 *  variantes conocidas y nos quedamos con la primera que parezca una URL real. */
interface ScraperApiOrganicExtended extends ScraperApiOrganic {
  displayed_link?: string;
  displayed_url?: string;
  redirect_link?: string;
  cite?: string;
}

/** Detecta si una URL es un wrapper de redirect de Google. */
function isGoogleRedirect(url: string): boolean {
  return /^https?:\/\/(?:www\.)?google\.[^/]+\/(?:goto|url|aclk)\?/i.test(url);
}

/** Intenta extraer la URL final que Google esconde en un wrapper `?url=` o `?q=`.
 *  Los `goto` de Google Mobile llevan la URL en formato protobuf codificado — imposible
 *  de decodificar client-side. Para esos casos usamos resolveGotoUrl() que sigue el redirect. */
function unwrapIfGoogleUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const raw = u.searchParams.get('url') ?? u.searchParams.get('q');
    if (raw && /^https?:\/\//i.test(raw)) return raw;
    return null;
  } catch {
    return null;
  }
}

/** Sigue el goto de Google Mobile para extraer la URL destino real.
 *  Google devuelve 200 con HTML que contiene la URL destino en el body (redirect JS).
 *  Buscamos la primera URL http(s) que NO sea del propio dominio de Google. */
export async function resolveGotoUrl(gotoUrl: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  try {
    const res = await fetch(gotoUrl, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      },
    });

    // Si hubo 3xx explícito, aprovechamos el Location header
    const location = res.headers.get('location');
    if (location && /^https?:\/\//i.test(location) && !isGoogleRedirect(location)) {
      return location;
    }

    // Ruta normal: body 200 con la URL en el HTML — la extraemos con regex
    const body = await res.text();
    const matches = body.match(/https?:\/\/[^"'<>\s`]{15,300}/g) ?? [];
    for (const url of matches) {
      // Descartamos URLs internas de Google (google.com/goto/gstatic/etc.)
      if (/^https?:\/\/[^/]*google\./i.test(url)) continue;
      if (/^https?:\/\/[^/]*gstatic\./i.test(url)) continue;
      if (/^https?:\/\/[^/]*googleusercontent\./i.test(url)) continue;
      return url;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Convierte un breadcrumb tipo "www.atida.com › es-es › fisiocrem-gel-forte-50-ml"
 *  en una URL real "https://www.atida.com/es-es/fisiocrem-gel-forte-50-ml".
 *
 *  IMPORTANTE: devuelve null si el breadcrumb está TRUNCADO (Google acorta paths largos
 *  con "..." o "…"). Reconstruir un slug truncado daría 404 seguro. En ese caso el caller
 *  cae al resolveGotoUrl (fetch al goto) para obtener la URL completa real. */
function displayedLinkToUrl(displayed: string): string | null {
  if (!displayed) return null;

  const parts = displayed
    .split(/\s*›\s*|\s*>\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  // Si alguna parte contiene "..." o "…" (medio o final), el breadcrumb está truncado
  // y NO podemos reconstruir la URL de forma fiable → devolvemos null.
  const hasTruncation = parts.some((p) => /(\.{3}|…)/.test(p));
  if (hasTruncation) return null;

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

/** Escoge la mejor URL "real" de un hit. Orden de preferencia:
 *  1. link directo (no wrapper) — caso ideal
 *  2. link con `?url=` desenvolvible — barato
 *  3. displayed_link como breadcrumb (`domain › path › ...`) — barato y muy común
 *  4. otros campos raw como redirect_link / cite
 *  Si nada de esto sirve, devolvemos el link crudo con marca `isRedirect` para que
 *  el caller decida si vale la pena hacer el fetch al goto para resolverlo. */
function pickRealLink(hit: ScraperApiOrganicExtended): { url: string; needsGotoResolve: boolean } | null {
  const link = hit.link;
  if (link && !isGoogleRedirect(link)) return { url: link, needsGotoResolve: false };

  if (link) {
    const unwrapped = unwrapIfGoogleUrl(link);
    if (unwrapped) return { url: unwrapped, needsGotoResolve: false };
  }

  if (hit.displayed_link) {
    const fromDisplayed = displayedLinkToUrl(hit.displayed_link);
    if (fromDisplayed) return { url: fromDisplayed, needsGotoResolve: false };
  }

  const otherCandidates = [hit.redirect_link, hit.displayed_url, hit.cite];
  for (const c of otherCandidates) {
    if (typeof c === 'string' && c.trim()) {
      const normalized = c.trim().startsWith('http') ? c.trim() : `https://${c.trim()}`;
      try {
        new URL(normalized);
        return { url: normalized, needsGotoResolve: false };
      } catch {
        // no-op
      }
    }
  }

  // Último recurso: devolvemos el link goto crudo, marcado para que el caller lo resuelva
  if (link) return { url: link, needsGotoResolve: true };
  return null;
}

async function runOneQuery(
  apiKey: string,
  query: string,
): Promise<{ ok: true; hits: SearchHit[]; rawSample?: unknown } | { ok: false; error: string }> {
  const params = new URLSearchParams({
    api_key: apiKey,
    query,
    country_code: 'es',
    tld: 'es', // sin esto Google.com no devuelve resultados de farmacias españolas
    num: '10',
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${SCRAPERAPI_GOOGLE_ENDPOINT}?${params.toString()}`, {
      method: 'GET',
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return {
        ok: false,
        error: `HTTP ${res.status}${detail ? `: ${detail.slice(0, 120)}` : ''}`,
      };
    }

    // Leemos como texto primero para poder loggear el body si algo va raro
    const bodyText = await res.text();
    let data: ScraperApiSearchResponse;
    try {
      data = JSON.parse(bodyText) as ScraperApiSearchResponse;
    } catch {
      console.warn(`[googleSearch] respuesta no-JSON de ScraperAPI: ${bodyText.slice(0, 300)}`);
      return { ok: false, error: `respuesta no es JSON: ${bodyText.slice(0, 80)}` };
    }

    const rawResults = (data.organic_results ?? []) as ScraperApiOrganicExtended[];

    // Diagnóstico: si hay 0 resultados, loggeamos qué keys vienen en la respuesta
    // (a veces ScraperAPI devuelve 200 con {credits_left: 0} o similar).
    if (rawResults.length === 0) {
      const topKeys = Object.keys(data as object);
      console.warn(
        `[googleSearch] query="${query}" → 0 organic_results. Keys del payload: [${topKeys.join(', ')}]. Body sample: ${bodyText.slice(0, 400)}`,
      );
    }

    const hits: SearchHit[] = rawResults.flatMap((o) => {
      const picked = pickRealLink(o);
      if (!picked || !o.title) return [];
      // Guardamos el goto crudo por si necesitamos resolverlo después
      const gotoLink = o.link && isGoogleRedirect(o.link) ? o.link : undefined;
      return [{ title: o.title, link: picked.url, snippet: o.snippet, gotoLink }];
    });

    // Sample de la primera fila cruda para diagnosticar si aún falla
    const rawSample = rawResults[0]
      ? { keys: Object.keys(rawResults[0]), first: rawResults[0] }
      : undefined;

    return { ok: true, hits, rawSample };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, error: 'timeout tras 20s' };
    }
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

export async function discoverProductUrl(input: DiscoverInput): Promise<DiscoverResult> {
  const attemptsLog: string[] = [];
  const apiKey = process.env.SCRAPER_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: 'Falta SCRAPER_API_KEY en el servidor.',
      attemptsLog,
      existsInWebButNotInDomain: false,
    };
  }

  const queries = buildQueryCascade(input);
  if (queries.length === 0) {
    return {
      ok: false,
      error: 'Sin datos para construir query (ni EAN, ni CN, ni nombre).',
      attemptsLog,
      existsInWebButNotInDomain: false,
    };
  }

  // Trackeamos si en algún momento Google devolvió resultados (aunque no sean del dominio).
  // Señal fuerte: si hay hits en web pero 0 en el dominio → esta farmacia no lista el producto.
  let sawAnyRawHits = false;

  for (const q of queries) {
    const res = await runOneQuery(apiKey, q);
    if (!res.ok) {
      attemptsLog.push(`[query="${q}"] ERROR ${res.error}`);
      continue;
    }

    if (res.hits.length > 0) sawAnyRawHits = true;

    let filtered = filterByDomain(res.hits, input.domain);
    attemptsLog.push(`[query="${q}"] ${res.hits.length} hits → ${filtered.length} tras filtrar por dominio`);

    // Si aún tenemos goto wrappers sin resolver, intentamos el fetch al goto como último recurso
    // (raro ahora que priorizamos displayed_link en pickRealLink).
    if (res.hits.length > 0 && filtered.length === 0) {
      const wrappedHits = res.hits.filter((h) => isGoogleRedirect(h.link)).slice(0, 5);
      if (wrappedHits.length > 0) {
        attemptsLog.push(`  ↳ ${wrappedHits.length} wrappers sin displayed_link resolvible, siguiendo redirects…`);
        const resolved = await Promise.all(
          wrappedHits.map(async (h) => {
            const real = await resolveGotoUrl(h.link);
            return real ? { ...h, link: real } : null;
          }),
        );
        const good = resolved.filter((h): h is SearchHit => h !== null);
        filtered = filterByDomain(good, input.domain);
        attemptsLog.push(`  ↳ tras redirects: ${good.length} URLs → ${filtered.length} del dominio`);
      } else {
        const sample = res.hits.slice(0, 3).map((h) => h.link).join(' | ');
        attemptsLog.push(`  ↳ URLs descartadas (sample): ${sample}`);
      }
    }

    if (filtered.length > 0) {
      return { ok: true, hits: filtered, queryUsed: q, attemptsLog };
    }
  }

  const existsInWebButNotInDomain = sawAnyRawHits;
  const error = existsInWebButNotInDomain
    ? 'Esta farmacia no tiene el producto en su catálogo online (Google lo encuentra en otros sitios pero no aquí).'
    : `Google no encontró el producto (ni en este dominio ni en la web general).`;

  return { ok: false, error, attemptsLog, existsInWebButNotInDomain };
}
