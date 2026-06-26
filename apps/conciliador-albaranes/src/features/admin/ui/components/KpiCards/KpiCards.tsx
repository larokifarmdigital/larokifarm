import type { UsageMetrics } from '@/shared/core';
import { formatNumber, formatUsd, formatDuration } from '@/shared/lib/format';

const ITEMS: Array<{
  key: keyof UsageMetrics | 'totalTokens';
  label: string;
  format: (m: UsageMetrics) => string;
  hint?: string;
}> = [
  {
    key: 'numComparisons',
    label: 'Comparaciones',
    format: (m) => formatNumber(m.numComparisons),
    hint: 'lotes procesados este mes',
  },
  {
    key: 'numPdfs',
    label: 'PDFs procesados',
    format: (m) => formatNumber(m.numPdfs),
  },
  {
    key: 'numDiscrepanciasItems',
    label: 'Discrepancias',
    format: (m) => formatNumber(m.numDiscrepanciasItems),
    hint: 'líneas con diferencias',
  },
  {
    key: 'totalTokens',
    label: 'Tokens Gemini',
    format: (m) => formatNumber(m.geminiInputTokens + m.geminiOutputTokens),
    hint: 'input + output',
  },
  {
    key: 'geminiCostUsd',
    label: 'Coste estimado',
    format: (m) => formatUsd(m.geminiCostUsd),
    hint: 'según precios actuales',
  },
  {
    key: 'durationMsTotal',
    label: 'Tiempo total',
    format: (m) => formatDuration(m.durationMsTotal),
    hint: 'procesamiento server-side',
  },
];

export function KpiCards({ metrics }: { metrics: UsageMetrics }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {ITEMS.map((it) => (
        <div
          key={it.key}
          className="rounded-md border border-gray-200 bg-white p-3 text-sm"
        >
          <p className="text-xs uppercase tracking-wider text-gray-500">{it.label}</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">{it.format(metrics)}</p>
          {it.hint && <p className="mt-1 text-xs text-gray-400">{it.hint}</p>}
        </div>
      ))}
    </div>
  );
}
