import { fetchHtml, type FetchHtmlResult, BROWSER_HEADERS } from './fetchHtml';

export interface UnlockedFetchOptions {
  /** Ejecuta JS en el navegador headless de ScraperAPI. Consume ~10x más créditos.
   *  Necesario para SPAs (Atida, PromoFarma, etc) donde el precio se inyecta con JS. */
  renderJs?: boolean;
  /** Salta el fetch directo y va directo a ScraperAPI. Útil cuando ya sabemos que
   *  el sitio bloquea o es SPA y no vale la pena gastar el intento directo. */
  skipDirect?: boolean;
}

async function fetchViaScraperApi(
  url: string,
  apiKey: string,
  opts: UnlockedFetchOptions,
): Promise<FetchHtmlResult> {
  const params = new URLSearchParams({
    api_key: apiKey,
    url,
    country_code: 'es',
    render: opts.renderJs ? 'true' : 'false',
  });
  const proxyUrl = `https://api.scraperapi.com/?${params.toString()}`;

  try {
    const res = await fetch(proxyUrl, {
      redirect: 'follow',
      // render=true tarda más (hasta 60s), sin render 30s sobra.
      signal: AbortSignal.timeout(opts.renderJs ? 70_000 : 30_000),
      headers: { ...BROWSER_HEADERS },
    });

    if (!res.ok) {
      const antibot = res.status === 403 || res.status === 429 || res.status === 503;
      return {
        ok: false,
        error: {
          kind: antibot ? 'antibot' : 'http',
          message: `ScraperAPI HTTP ${res.status}${opts.renderJs ? ' (render=true)' : ''}`,
          status: res.status,
        },
      };
    }

    const html = await res.text();
    return { ok: true, html, finalUrl: url };
  } catch (err) {
    return {
      ok: false,
      error: {
        kind: 'network',
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

export async function unlockedFetch(
  url: string,
  opts: UnlockedFetchOptions = {},
): Promise<FetchHtmlResult> {
  const apiKey = process.env.SCRAPER_API_KEY;

  // Modo render=true o skipDirect: vamos directo a ScraperAPI, sin intento directo.
  if (opts.renderJs || opts.skipDirect) {
    if (!apiKey) {
      return {
        ok: false,
        error: {
          kind: 'network',
          message: 'Falta SCRAPER_API_KEY para render=true / skipDirect',
        },
      };
    }
    return fetchViaScraperApi(url, apiKey, opts);
  }

  // Ruta estándar: intento directo primero (gratis) → ScraperAPI si detectamos antibot.
  const direct = await fetchHtml(url);
  if (direct.ok) return direct;
  if (!apiKey) return direct;
  if (direct.error.kind !== 'antibot') return direct;

  const via = await fetchViaScraperApi(url, apiKey, opts);
  if (via.ok) return via;

  return direct;
}
