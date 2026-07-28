'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/shared/components/atoms/Button';
import { probeAllAction } from '../api/probeAction';
import { UrlRow } from '../components/UrlRow';
import { HitRateSummary } from '../components/HitRateSummary';
import type { ProbeResult } from '../domain/models/Extraction';

export type ProbeViewProps = {
  urls: string[];
};

export function ProbeView({ urls }: ProbeViewProps) {
  const [bulkResults, setBulkResults] = useState<(ProbeResult | null)[]>(() =>
    urls.map(() => null),
  );
  const [pending, startTransition] = useTransition();

  const runAll = () => {
    startTransition(async () => {
      const results = await probeAllAction();
      setBulkResults(results);
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Scout · probe de precios
          </h1>
          <p className="text-sm text-zinc-500">
            {urls.length} URLs en <code>PROBE_URLS</code>
          </p>
        </div>
        <Button onClick={runAll} disabled={pending || urls.length === 0}>
          {pending ? 'Probando todas…' : 'Probar todas'}
        </Button>
      </header>

      <HitRateSummary results={bulkResults} total={urls.length} />

      {urls.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          Edita <code>src/features/price-probe/config/urls.ts</code> y añade URLs de fichas de
          producto.
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-950">
          {urls.map((url, i) => (
            <UrlRow key={url} url={url} externalResult={bulkResults[i]} />
          ))}
        </div>
      )}
    </div>
  );
}
