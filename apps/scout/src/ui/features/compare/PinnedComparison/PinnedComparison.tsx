'use client';

import type { ComparisonReport, ComparisonRow } from '@/core/domain/models';

export interface PinnedComparisonProps {
  reports: ComparisonReport[];
  onRemove: (index: number) => void;
  onClear: () => void;
}

function formatPrice(precio: number, moneda: string): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 2,
  }).format(precio);
}

function initials(name: string): string {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/);
  if (words.length === 0 || !words[0]) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

interface Summary {
  okCount: number;
  minPrice?: number;
  maxPrice?: number;
  moneda: string;
  bestRow?: ComparisonRow;
}

function summarize(report: ComparisonReport): Summary {
  const okRows = report.rows.filter((r) => r.status === 'ok' && typeof r.precio === 'number');
  if (okRows.length === 0) return { okCount: 0, moneda: 'EUR' };
  const prices = okRows.map((r) => r.precio!);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const bestRow = okRows.find((r) => r.precio === minPrice);
  return {
    okCount: okRows.length,
    minPrice,
    maxPrice,
    moneda: okRows[0].moneda ?? 'EUR',
    bestRow,
  };
}

/**
 * Grid de reportes "fijados" para comparar múltiples productos lado a lado.
 * Cada card muestra un resumen: título del producto buscado + mejor precio + rango.
 */
export function PinnedComparison({ reports, onRemove, onClear }: PinnedComparisonProps) {
  if (reports.length === 0) return null;

  // Calcular el precio más bajo GLOBAL (para destacar entre todos los productos)
  const globalMin = Math.min(
    ...reports
      .map((r) => summarize(r).minPrice ?? Infinity)
      .filter((p) => Number.isFinite(p)),
  );

  return (
    <section
      className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50/70 to-white p-5 dark:border-teal-900/50 dark:from-teal-950/20 dark:to-zinc-950"
      aria-label="Comparativa de productos fijados"
    >
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 17V3M12 3l4 4M12 3l-4 4M5 21h14" />
            </svg>
          </span>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Comparando {reports.length} producto{reports.length === 1 ? '' : 's'}
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-500">
              Fijá más productos con el botón &quot;Fijar para comparar&quot; en cada resultado.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-medium text-zinc-500 hover:text-rose-600 dark:text-zinc-500 dark:hover:text-rose-400"
        >
          Limpiar todos
        </button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((report, idx) => {
          const summary = summarize(report);
          const label =
            report.product?.nombre ??
            report.input.nombreHint ??
            report.input.cn ??
            report.input.ean ??
            'Producto';
          const isGlobalCheapest =
            summary.minPrice != null && summary.minPrice === globalMin && globalMin !== Infinity;

          return (
            <article
              key={`${idx}-${label}`}
              className={`relative rounded-xl border p-4 transition-all ${
                isGlobalCheapest
                  ? 'border-emerald-400 bg-emerald-50/60 shadow-sm dark:border-emerald-700/70 dark:bg-emerald-950/20'
                  : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950'
              }`}
            >
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-rose-600 dark:hover:bg-zinc-800 dark:hover:text-rose-400"
                aria-label={`Quitar ${label} de la comparación`}
                title="Quitar de la comparación"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>

              <div className="pr-6">
                <h4 className="line-clamp-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100" title={label}>
                  {label}
                </h4>

                {summary.okCount === 0 ? (
                  <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
                    Sin precios encontrados.
                  </p>
                ) : (
                  <>
                    <div className="mt-3 flex items-baseline gap-1.5">
                      <span
                        className={`text-2xl font-bold tabular-nums ${
                          isGlobalCheapest
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-zinc-900 dark:text-zinc-100'
                        }`}
                      >
                        {formatPrice(summary.minPrice!, summary.moneda)}
                      </span>
                      {isGlobalCheapest && (
                        <span className="inline-flex items-center rounded-full bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                          Más barato
                        </span>
                      )}
                    </div>

                    {summary.bestRow && (
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                        <span className="flex h-4 w-4 items-center justify-center rounded bg-zinc-100 text-[9px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                          {initials(summary.bestRow.pharmacyName)}
                        </span>
                        <span className="truncate">{summary.bestRow.pharmacyName}</span>
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
                      <span>
                        {summary.okCount} farmacia{summary.okCount === 1 ? '' : 's'}
                      </span>
                      {summary.maxPrice != null &&
                        summary.minPrice != null &&
                        summary.maxPrice > summary.minPrice && (
                          <span>hasta {formatPrice(summary.maxPrice, summary.moneda)}</span>
                        )}
                    </div>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
