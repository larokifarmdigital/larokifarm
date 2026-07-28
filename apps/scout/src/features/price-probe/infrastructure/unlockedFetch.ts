import { fetchHtml, type FetchHtmlResult, BROWSER_HEADERS } from './fetchHtml';

type ScraperApiResponse = {
  ok: boolean;
  status: number;
  html: string;
  finalUrl: string;
};

async function fetchViaScraperApi(url: string, apiKey: string): Promise<FetchHtmlResult> {
  const params = new URLSearchParams({
    api_key: apiKey,
    url,
    country_code: 'es',
    render: 'false',
  });
  const proxyUrl = `https://api.scraperapi.com/?${params.toString()}`;

  try {
    const res = await fetch(proxyUrl, {
      redirect: 'follow',
      signal: AbortSignal.timeout(30000),
      headers: { ...BROWSER_HEADERS },
    });

    if (!res.ok) {
      const antibot = res.status === 403 || res.status === 429 || res.status === 503;
      return {
        ok: false,
        error: {
          kind: antibot ? 'antibot' : 'http',
          message: `ScraperAPI HTTP ${res.status}`,
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

export async function unlockedFetch(url: string): Promise<FetchHtmlResult> {
  const apiKey = process.env.SCRAPER_API_KEY;
  const direct = await fetchHtml(url);

  if (direct.ok) return direct;
  if (!apiKey) return direct;
  if (direct.error.kind !== 'antibot') return direct;

  const via = await fetchViaScraperApi(url, apiKey);
  if (via.ok) return via;

  return direct;
}
