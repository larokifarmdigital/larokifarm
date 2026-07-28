import { Badge } from '@/shared/components/atoms/Badge';
import type { ProbeResult } from '../../domain/models/Extraction';

export type ResultCardProps = {
  result: ProbeResult;
};

const strategyTone: Record<string, 'success' | 'info' | 'neutral' | 'warning'> = {
  'json-ld': 'success',
  'shopify-js': 'info',
  'og-meta': 'neutral',
  microdata: 'neutral',
  'prestashop-ajax': 'warning',
};

export function ResultCard({ result }: ResultCardProps) {
  if (result.ok) {
    const d = result.data;
    return (
      <div className="space-y-1 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {d.precio.toFixed(2)} {d.moneda}
          </span>
          {d.precioTachado != null && (
            <span className="text-zinc-500 line-through">
              antes {d.precioTachado.toFixed(2)} {d.moneda}
            </span>
          )}
          <Badge tone={strategyTone[d.via] ?? 'neutral'}>{d.via}</Badge>
          <span className="text-xs text-zinc-500">{result.ms}ms</span>
          {d.enStock === false && <Badge tone="danger">agotado</Badge>}
        </div>
        {(d.ean || d.sku) && (
          <div className="text-xs text-zinc-600 dark:text-zinc-400">
            {d.ean && (
              <>
                EAN <span className="font-mono">{d.ean}</span>
              </>
            )}
            {d.ean && d.sku && ' · '}
            {d.sku && (
              <>
                SKU <span className="font-mono">{d.sku}</span>
              </>
            )}
          </div>
        )}
        {d.nombre && (
          <div className="text-zinc-700 dark:text-zinc-300">{d.nombre}</div>
        )}
      </div>
    );
  }

  const { error } = result;
  const tone: 'danger' | 'warning' | 'neutral' =
    error.kind === 'antibot' ? 'warning' : error.kind === 'no-data' ? 'neutral' : 'danger';
  const label =
    error.kind === 'antibot'
      ? `HTTP ${error.status} (anti-bot)`
      : error.kind === 'http'
        ? `HTTP ${error.status}`
        : error.kind === 'network'
          ? 'Error de red'
          : 'Sin datos';

  return (
    <div className="space-y-1 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={tone}>{label}</Badge>
        <span className="text-xs text-zinc-500">{result.ms}ms</span>
        {error.kind === 'no-data' && error.teniaJsonLd && (
          <Badge tone="warning">tenía JSON-LD (no parseable)</Badge>
        )}
      </div>
      <div className="text-xs text-zinc-600 dark:text-zinc-400">{error.message}</div>
    </div>
  );
}
