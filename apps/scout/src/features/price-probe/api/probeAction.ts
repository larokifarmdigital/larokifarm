'use server';

import { z } from 'zod';
import { PROBE_URLS } from '../config/urls';
import { extractPriceUseCase } from '../application/extractPriceUseCase';
import type { ProbeResult } from '../domain/models/Extraction';

const inputSchema = z.object({ url: z.string().url() });

export type ProbeActionState =
  | { status: 'idle' }
  | { status: 'error'; error: string }
  | { status: 'done'; result: ProbeResult };

export async function probeAction(
  _prev: ProbeActionState,
  formData: FormData,
): Promise<ProbeActionState> {
  const parsed = inputSchema.safeParse({ url: formData.get('url') });
  if (!parsed.success) {
    return { status: 'error', error: 'URL inválida' };
  }

  if (!PROBE_URLS.includes(parsed.data.url)) {
    return { status: 'error', error: 'URL no está en PROBE_URLS' };
  }

  const result = await extractPriceUseCase(parsed.data.url);
  return { status: 'done', result };
}

export async function probeAllAction(): Promise<ProbeResult[]> {
  const results: ProbeResult[] = [];
  for (let i = 0; i < PROBE_URLS.length; i++) {
    const url = PROBE_URLS[i];
    const result = await extractPriceUseCase(url);
    results.push(result);
    if (i < PROBE_URLS.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  return results;
}
