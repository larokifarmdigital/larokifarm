import type { ProbeResult } from '../../domain/models/Extraction';

export type HitRateSummaryProps = {
  results: (ProbeResult | null)[];
  total: number;
};

export function HitRateSummary({ results, total }: HitRateSummaryProps) {
  const probed = results.filter((r): r is ProbeResult => r != null);
  const hits = probed.filter((r) => r.ok);

  const perStrategy = new Map<string, number>();
  let withId = 0;

  for (const r of hits) {
    if (!r.ok) continue;
    perStrategy.set(r.data.via, (perStrategy.get(r.data.via) ?? 0) + 1);
    if (r.data.ean || r.data.sku) withId++;
  }

  const pct = probed.length ? Math.round((hits.length / probed.length) * 100) : 0;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="text-zinc-900 dark:text-zinc-50">
        <span className="font-medium">Hit rate:</span> {hits.length}/{probed.length}{' '}
        {probed.length > 0 && <span className="text-zinc-500">({pct}%)</span>}
        <span className="ml-2 text-xs text-zinc-500">
          — total configurado: {total}
          {probed.length < total && ` · sin probar: ${total - probed.length}`}
        </span>
      </div>
      {perStrategy.size > 0 && (
        <div className="mt-1 text-zinc-600 dark:text-zinc-400">
          {[...perStrategy.entries()]
            .map(([name, n]) => `${name} ${n}`)
            .join(' · ')}
        </div>
      )}
      {hits.length > 0 && (
        <div className="mt-1 text-zinc-600 dark:text-zinc-400">
          Con EAN/SKU: {withId}/{hits.length}
        </div>
      )}
    </div>
  );
}
