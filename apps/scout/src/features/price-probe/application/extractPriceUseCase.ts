import * as cheerio from 'cheerio';
import type { ProbeResult } from '../domain/models/Extraction';
import { unlockedFetch } from '../infrastructure/unlockedFetch';
import { STRATEGIES } from '../infrastructure/strategies';

export async function extractPriceUseCase(url: string): Promise<ProbeResult> {
  const t0 = Date.now();

  const fetched = await unlockedFetch(url);
  if (!fetched.ok) {
    return { ok: false, url, ms: Date.now() - t0, error: fetched.error };
  }

  const $ = cheerio.load(fetched.html);
  const ctx = { url, html: fetched.html, $ };

  for (const strategy of STRATEGIES) {
    try {
      const hit = await strategy.run(ctx);
      if (hit) return { ok: true, url, ms: Date.now() - t0, data: hit };
    } catch {
      // one broken strategy must not tear down the cascade
    }
  }

  return {
    ok: false,
    url,
    ms: Date.now() - t0,
    error: {
      kind: 'no-data',
      message: 'Sin datos estructurados → requiere adapter manual',
      teniaJsonLd: $('script[type="application/ld+json"]').length > 0,
    },
  };
}
