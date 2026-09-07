'use client';

import type { ComparisonReport } from '@/core/domain/models';
import { clearSearchHistory, relativeTime, useSearchHistory } from '../hooks/useSearchHistory';

export interface RecentSearchesProps {
  /**
   * Callback cuando el user clica una búsqueda del histórico.
   * Si la entrada tiene reporte cacheado, se propaga junto con el timestamp para
   * que el padre lo muestre SIN volver a llamar las APIs.
   */
  onPick: (entry: {
    cn?: string;
    ean?: string;
    nombre?: string;
    report?: ComparisonReport;
    timestamp?: number;
  }) => void;
}

function formatPrice(precio: number, moneda: string): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 2,
  }).format(precio);
}

export function RecentSearches({ onPick }: RecentSearchesProps) {
  const entries = useSearchHistory();
  if (entries.length === 0) return null;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between px-1">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          Búsquedas recientes
        </span>
        <button
          type="button"
          onClick={clearSearchHistory}
          className="text-[11px] font-medium text-zinc-500 hover:text-rose-600 dark:text-zinc-500 dark:hover:text-rose-400"
        >
          Limpiar historial
        </button>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((e) => {
          const displayName = e.nombre ?? e.cn ?? e.ean ?? 'Búsqueda';
          return (
            <li key={e.key}>
              <button
                type="button"
                onClick={() =>
                  onPick({
                    cn: e.cn,
                    ean: e.ean,
                    nombre: e.nombre,
                    report: e.report,
                    timestamp: e.timestamp,
                  })
                }
                className="group flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-left transition-all hover:border-teal-400 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-teal-600"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 group-hover:bg-teal-50 group-hover:text-teal-600 dark:bg-zinc-800 dark:text-zinc-400 dark:group-hover:bg-teal-950/40 dark:group-hover:text-teal-400">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {displayName}
                    </div>
                    {e.report && (
                      <span
                        className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                        title="Precios guardados — no consume API al abrir"
                      >
                        <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="currentColor" aria-hidden="true">
                          <path d="M13 2 3 14h7l-1 8 10-12h-7z" />
                        </svg>
                        Cache
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 dark:text-zinc-500">
                    <span>{relativeTime(e.timestamp)}</span>
                    {e.resultsCount > 0 && (
                      <>
                        <span>·</span>
                        <span>
                          {e.resultsCount} farm.
                          {e.bestPrice && e.moneda && ` · desde ${formatPrice(e.bestPrice, e.moneda)}`}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-zinc-400 group-hover:translate-x-0.5 group-hover:text-teal-600 dark:text-zinc-600 dark:group-hover:text-teal-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
