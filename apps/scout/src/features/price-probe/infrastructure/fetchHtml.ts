import type { ProbeFailure } from '../domain/models/Extraction';

export const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br, zstd',
  'Cache-Control': 'max-age=0',
  'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

export type FetchHtmlOk = { ok: true; html: string; finalUrl: string };
export type FetchHtmlErr = { ok: false; error: ProbeFailure };
export type FetchHtmlResult = FetchHtmlOk | FetchHtmlErr;

export async function fetchHtml(url: string): Promise<FetchHtmlResult> {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
      headers: BROWSER_HEADERS,
    });

    if (!res.ok) {
      const antibot = res.status === 403 || res.status === 429 || res.status === 503;
      return {
        ok: false,
        error: {
          kind: antibot ? 'antibot' : 'http',
          message: antibot
            ? `HTTP ${res.status} — probable anti-bot, requiere Playwright/proxy`
            : `HTTP ${res.status}`,
          status: res.status,
        },
      };
    }

    const html = await res.text();
    return { ok: true, html, finalUrl: res.url };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const kind: ProbeFailure['kind'] = /timeout|abort/i.test(message) ? 'network' : 'network';
    return { ok: false, error: { kind, message } };
  }
}
