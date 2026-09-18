'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import type { ComparisonReport } from '@/core/domain/models';
import { compareAction, type CompareActionState } from '@/ui/actions/compareAction';
import { AppShell } from '@/ui/components/AppShell';
import { MOSTRAR_ESCANER } from '@/ui/lib/feature-flags';
import { BarcodeScanner } from './BarcodeScanner';
import { CompareForm } from './CompareForm';
import { ComparisonTable } from './ComparisonTable';
import { MedicamentoInfoCard } from './MedicamentoInfoCard';
import { PinnedComparison } from './PinnedComparison';
import { RecentSearches } from './RecentSearches';
import { ShareButton } from './ShareButton';
import { isStale, pushSearchHistory, relativeTime } from './hooks/useSearchHistory';
import { readUrlSearchParams, replaceUrlSearchParams } from './hooks/useUrlParams';

const initialState: CompareActionState = { status: 'idle' };

const SUGGESTED_PRODUCTS: Array<{ nombre: string; categoria: string }> = [
  { nombre: 'Fisiocrem Gel Forte 50 ml', categoria: 'Muscular' },
  { nombre: 'Bioderma Sensibio H2O 500 ml', categoria: 'Cuidado facial' },
  { nombre: 'Isdin Fusion Water Magic 50 ml', categoria: 'Solar' },
  { nombre: 'Frenadol Complex 10 sobres', categoria: 'Resfriado' },
  { nombre: 'Nuxe Huile Prodigieuse 100 ml', categoria: 'Cosmética' },
  { nombre: 'Aquilea Sueño 30 comprimidos', categoria: 'Complemento' },
];

function SkeletonCard() {
  return (
    <div className="glass animate-pulse p-4">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 shrink-0 rounded-[var(--radius-sm)] bg-white/[0.06]" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 rounded bg-white/[0.06]" />
          <div className="h-3 w-1/3 rounded bg-white/[0.06]" />
        </div>
        <div className="space-y-2 text-right">
          <div className="ml-auto h-6 w-20 rounded bg-white/[0.06]" />
          <div className="ml-auto h-3 w-16 rounded bg-white/[0.06]" />
        </div>
      </div>
    </div>
  );
}

/** Clave de identidad de un reporte para dedup en el pinning. */
function reportKey(r: ComparisonReport): string {
  return `${r.input.cn ?? ''}|${r.input.ean ?? ''}|${(r.input.nombreHint ?? r.input.nombre ?? '').toLowerCase().trim()}`;
}

function isReportPinned(pinned: ComparisonReport[], candidate: ComparisonReport): boolean {
  const k = reportKey(candidate);
  return pinned.some((p) => reportKey(p) === k);
}

/** Fill the form inputs by ID and dispatch a submit. */
function fillAndSubmit(cn?: string, ean?: string, nombre?: string): void {
  const setInput = (id: string, value: string | undefined) => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (el) el.value = value ?? '';
  };
  setInput('cn', cn);
  setInput('ean', ean);
  setInput('nombre', nombre);
  const form = document.querySelector<HTMLFormElement>('form');
  form?.requestSubmit();
}

export function CompareView() {
  const [state, formAction, isPending] = useActionState(compareAction, initialState);
  // Lazy init: leemos la URL en el primer render en cliente (evita setState en useEffect).
  // En SSR el objeto será {} y en el primer render de cliente ya tendrá los valores de la URL.
  const [prefilled, setPrefilled] = useState<{ cn?: string; ean?: string; nombre?: string }>(
    () => (typeof window !== 'undefined' ? readUrlSearchParams() : {}),
  );
  // Reportes fijados por el user para comparar múltiples productos lado a lado.
  const [pinnedReports, setPinnedReports] = useState<ComparisonReport[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  /**
   * Reporte cacheado que se muestra al abrir una búsqueda del historial SIN volver a
   * llamar las APIs. Cuando el user hace click en "Actualizar" o hace una búsqueda
   * nueva, este cache se limpia (null) y priorizamos state.status === 'done'.
   */
  const [cachedReport, setCachedReport] = useState<{
    report: ComparisonReport;
    timestamp: number;
  } | null>(null);
  const autoSubmittedRef = useRef(false);
  const savedResultsRef = useRef<string | null>(null);

  // 1) Al montar: si la URL trae ?cn/?ean/?nombre, auto-submit (sin setState)
  useEffect(() => {
    if (autoSubmittedRef.current) return;
    const params = readUrlSearchParams();
    if (params.cn || params.ean || params.nombre) {
      autoSubmittedRef.current = true;
      setTimeout(() => fillAndSubmit(params.cn, params.ean, params.nombre), 30);
    }
  }, []);

  // 2) Al tener resultados: sync URL + guardar en historial (una sola vez por resultado)
  useEffect(() => {
    if (state.status !== 'done') return;
    const key = `${state.result.input.cn ?? ''}|${state.result.input.ean ?? ''}|${state.result.input.nombreHint ?? state.result.input.nombre ?? ''}`;
    if (savedResultsRef.current === key) return;
    savedResultsRef.current = key;

    const okRows = state.result.rows.filter((r) => r.status === 'ok');
    const bestPrice =
      okRows.length > 0
        ? Math.min(...okRows.map((r) => (typeof r.precio === 'number' ? r.precio : Infinity)))
        : undefined;
    const moneda = okRows[0]?.moneda ?? 'EUR';

    pushSearchHistory({
      cn: state.result.input.cn,
      ean: state.result.input.ean,
      nombre: state.result.input.nombreHint ?? state.result.input.nombre,
      resultsCount: okRows.length,
      bestPrice: bestPrice != null && Number.isFinite(bestPrice) ? bestPrice : undefined,
      moneda,
      // Guardamos el reporte completo para que al abrirlo desde el historial NO se re-consuma API.
      report: state.result,
    });

    replaceUrlSearchParams({
      cn: state.result.input.cn,
      ean: state.result.input.ean,
      nombre: state.result.input.nombreHint ?? state.result.input.nombre,
    });

    // Si el nuevo reporte no coincide con el que está cacheado (ej: refresh o nueva búsqueda),
    // limpiamos el cache para que se renderice el fresco.
    setCachedReport((prev) => (prev && reportKey(prev.report) === key ? prev : null));
  }, [state]);

  function handleSuggestionClick(name: string) {
    setPrefilled({ nombre: name });
    setTimeout(() => fillAndSubmit(undefined, undefined, name), 30);
  }

  function handleHistoryPick(entry: {
    cn?: string;
    ean?: string;
    nombre?: string;
    report?: ComparisonReport;
    timestamp?: number;
  }) {
    setPrefilled({ cn: entry.cn, ean: entry.ean, nombre: entry.nombre });

    if (entry.report && entry.timestamp) {
      // Cache hit: mostramos el reporte guardado sin volver a llamar las APIs.
      setCachedReport({ report: entry.report, timestamp: entry.timestamp });
      // Rellenamos los inputs del form pero NO hacemos submit (evitamos consumir créditos).
      setTimeout(() => {
        const setInput = (id: string, v?: string) => {
          const el = document.getElementById(id) as HTMLInputElement | null;
          if (el) el.value = v ?? '';
        };
        setInput('cn', entry.cn);
        setInput('ean', entry.ean);
        setInput('nombre', entry.nombre);
      }, 30);
      // Sync URL para permitir compartir la búsqueda cacheada también
      replaceUrlSearchParams({ cn: entry.cn, ean: entry.ean, nombre: entry.nombre });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Sin cache disponible → fallback al comportamiento anterior (submit real)
    setCachedReport(null);
    setTimeout(() => fillAndSubmit(entry.cn, entry.ean, entry.nombre), 30);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Fuerza actualización del reporte cacheado — re-ejecuta la búsqueda contra las APIs. */
  function handleRefreshCached() {
    if (!cachedReport) return;
    const { input } = cachedReport.report;
    setCachedReport(null);
    savedResultsRef.current = null;
    setTimeout(
      () => fillAndSubmit(input.cn, input.ean, input.nombreHint ?? input.nombre),
      30,
    );
  }

  function handleNewSearch() {
    setPrefilled({});
    setCachedReport(null);
    const form = document.querySelector<HTMLFormElement>('form');
    form?.reset();
    replaceUrlSearchParams({});
    savedResultsRef.current = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => document.getElementById('nombre')?.focus(), 300);
  }

  const scannerButton = MOSTRAR_ESCANER ? (
    <button
      type="button"
      onClick={() => setScannerOpen(true)}
      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[color:var(--border)] bg-white/[0.03] px-2.5 text-xs font-medium text-[color:var(--foreground)] transition-colors duration-[var(--dur-fast)] hover:border-[color:var(--border-strong)] hover:bg-white/[0.06]"
      title="Escanear código de barras con la cámara"
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 5v14M8 5v14M12 5v14M17 5v14M21 5v14" />
      </svg>
      <span className="hidden sm:inline">Escanear</span>
    </button>
  ) : null;

  return (
    <AppShell actions={scannerButton}>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
        {MOSTRAR_ESCANER && (
          <BarcodeScanner
            isOpen={scannerOpen}
            onClose={() => setScannerOpen(false)}
            onDetected={(ean) => {
              setScannerOpen(false);
              setPrefilled({ ean });
              setTimeout(() => fillAndSubmit(undefined, ean, undefined), 30);
            }}
          />
        )}

        <section className="mb-10 flex flex-col gap-4 sm:mb-12" data-reveal>
          <span className="section-eyebrow self-start">Comparador de precios</span>
          <h1 className="h-display h-display-gradient m-0 max-w-[18ch]">
            Precios al momento en decenas de farmacias.
          </h1>
          <p className="max-w-[52ch] text-[color:var(--muted-foreground)]">
            Introduce el <span className="text-[color:var(--foreground-strong)]">Código Nacional</span>,
            el <span className="text-[color:var(--foreground-strong)]">EAN</span> o el{' '}
            <span className="text-[color:var(--foreground-strong)]">nombre exacto</span> del producto.
            Buscamos en tiempo real en Google Shopping y en las fichas indexadas por Google.
          </p>
        </section>

        <section
          className="glass mb-8 p-5 sm:p-6"
          style={{ '--reveal-delay': '120ms' } as React.CSSProperties}
          data-reveal
        >
          <CompareForm
            action={formAction}
            defaultCn={prefilled.cn}
            defaultEan={prefilled.ean}
            defaultNombre={prefilled.nombre}
          />
        </section>

        {/* Loading */}
        {isPending && (
          <div className="space-y-4">
            <div className="glass flex items-center gap-3 px-4 py-3 text-sm text-[color:var(--foreground)]">
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[color:var(--border-strong)] border-t-[color:var(--accent)]" />
              Buscando precios en decenas de farmacias…{' '}
              <span className="text-[color:var(--muted)]">(15–45s)</span>
            </div>
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {!isPending && state.status === 'error' && (
          <div className="rounded-[var(--radius-lg)] border border-[color:var(--pastel-red-fg)]/25 bg-[color:var(--pastel-red-bg)] p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[color:var(--pastel-red-fg)]/15 text-[color:var(--pastel-red-fg)]">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[color:var(--pastel-red-fg)]">
                  No se pudo completar la búsqueda
                </p>
                <p className="mt-1 text-sm text-[color:var(--pastel-red-fg)]/85">{state.error}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const form = document.querySelector<HTMLFormElement>('form');
                      form?.requestSubmit();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[color:var(--pastel-red-fg)] px-3 py-1.5 text-xs font-semibold text-white transition-opacity duration-[var(--dur-fast)] hover:opacity-90 active:scale-[0.98]"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
                      <path d="M21 3v5h-5" />
                      <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
                      <path d="M3 21v-5h5" />
                    </svg>
                    Reintentar
                  </button>
                  <button
                    type="button"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[color:var(--pastel-red-fg)]/35 bg-transparent px-3 py-1.5 text-xs font-semibold text-[color:var(--pastel-red-fg)] transition-colors duration-[var(--dur-fast)] hover:bg-[color:var(--pastel-red-fg)]/10"
                  >
                    Cambiar búsqueda
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Comparativa de productos fijados (arriba de todo cuando hay 1+) */}
        {pinnedReports.length > 0 && (
          <div className="mb-6">
            <PinnedComparison
              reports={pinnedReports}
              onRemove={(idx) => setPinnedReports((prev) => prev.filter((_, i) => i !== idx))}
              onClear={() => setPinnedReports([])}
            />
          </div>
        )}

        {/* Resultados: prioridad cachedReport > state.result. isPending oculta ambos. */}
        {!isPending &&
          (() => {
            const activeReport = cachedReport?.report ?? (state.status === 'done' ? state.result : null);
            if (!activeReport) return null;
            const isCached = cachedReport !== null;
            const cacheAge = cachedReport?.timestamp;
            const stale = cacheAge != null && isStale(cacheAge);
            const isPinned = isReportPinned(pinnedReports, activeReport);

            return (
              <div className="space-y-4">
                {/* Banner de cache local */}
                {isCached && cacheAge != null && (
                  <div
                    className={
                      stale
                        ? 'flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-[color:var(--pastel-amber-fg)]/25 bg-[color:var(--pastel-amber-bg)] px-4 py-2.5 text-xs text-[color:var(--pastel-amber-fg)]'
                        : 'flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-[color:var(--border)] bg-white/[0.02] px-4 py-2.5 text-xs text-[color:var(--muted-foreground)] backdrop-blur'
                    }
                  >
                    <div className="flex items-center gap-2">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v6l4 2" />
                      </svg>
                      <span>
                        {stale ? 'Precios posiblemente desactualizados' : 'Precios guardados en tu navegador'} · {relativeTime(cacheAge)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRefreshCached}
                      className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[color:var(--accent)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--accent-fg)] transition-opacity duration-[var(--dur-fast)] hover:brightness-110 active:scale-[0.98]"
                      title="Volver a consultar las APIs para obtener precios actualizados"
                    >
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
                        <path d="M21 3v5h-5" />
                        <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
                        <path d="M3 21v-5h5" />
                      </svg>
                      Actualizar precios
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="section-eyebrow">Resultados</h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isPinned}
                      onClick={() => setPinnedReports((prev) => [...prev, activeReport])}
                      className={
                        isPinned
                          ? 'inline-flex cursor-not-allowed items-center gap-1.5 rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-[color:var(--muted)]'
                          : 'inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[color:var(--accent)] px-3 py-1.5 text-xs font-medium text-[color:var(--accent-fg)] ring-1 ring-[color:var(--accent-border)] transition-all duration-[var(--dur-fast)] hover:brightness-110 hover:shadow-[0_0_16px_var(--accent-glow)] active:scale-[0.98]'
                      }
                      title={isPinned ? 'Ya está en la comparativa' : 'Fijar este producto para comparar con otros'}
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {isPinned ? (
                          <path d="M20 6 9 17l-5-5" />
                        ) : (
                          <path d="M12 17V3M12 3l4 4M12 3l-4 4M5 21h14" />
                        )}
                      </svg>
                      {isPinned ? 'Fijado' : 'Fijar para comparar'}
                    </button>
                    <ShareButton
                      input={{
                        cn: activeReport.input.cn,
                        ean: activeReport.input.ean,
                        nombre: activeReport.input.nombreHint ?? activeReport.input.nombre,
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleNewSearch}
                      className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-[color:var(--foreground)] backdrop-blur transition-colors duration-[var(--dur-fast)] hover:border-[color:var(--border-strong)] hover:bg-white/[0.06]"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      Nueva búsqueda
                    </button>
                  </div>
                </div>
                {/* Info CIMA solo si el user buscó por CN */}
                {activeReport.input.cn && <MedicamentoInfoCard cn={activeReport.input.cn} />}
                <ComparisonTable report={activeReport} />
              </div>
            );
          })()}

        {/* Empty state: productos sugeridos + historial */}
        {!isPending && state.status === 'idle' && (
          <div className="space-y-8">
            {/* Búsquedas recientes (solo aparece si el user ya buscó antes) */}
            <RecentSearches onPick={handleHistoryPick} />

            <div>
              <h3 className="section-eyebrow mb-4">Búsquedas populares</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {SUGGESTED_PRODUCTS.map((p, i) => (
                  <button
                    key={p.nombre}
                    type="button"
                    onClick={() => handleSuggestionClick(p.nombre)}
                    style={{ '--reveal-delay': `${i * 40}ms` } as React.CSSProperties}
                    data-reveal
                    className="glass motion-magnetic group flex items-center gap-3 p-3 text-left"
                  >
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-white/[0.04] text-[color:var(--foreground-strong)] transition-colors group-hover:border-[color:var(--accent-border)] group-hover:bg-[color:var(--accent-soft)] group-hover:text-[color:var(--accent)]">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.5 20.5 3.5 13.5a5 5 0 0 1 0-7.07l0 0a5 5 0 0 1 7.07 0L20.5 16.5a3 3 0 0 1 0 4.24l0 0a3 3 0 0 1-4.24 0z" />
                        <path d="m8.5 8.5 7 7" />
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-[color:var(--foreground-strong)]">
                        {p.nombre}
                      </div>
                      <div className="font-mono-tabular text-[10px] uppercase tracking-wide text-[color:var(--muted)]">
                        {p.categoria}
                      </div>
                    </div>
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4 shrink-0 text-[color:var(--muted)] transition-transform duration-[var(--dur-fast)] group-hover:translate-x-0.5 group-hover:text-[color:var(--accent)]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m9 6 6 6-6 6" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <footer className="mt-16 border-t border-[color:var(--border)] pt-6">
          <div className="flex flex-col items-center justify-between gap-2 font-mono-tabular text-[11px] text-[color:var(--muted)] sm:flex-row">
            <span>Google Shopping · Google Search · CIMA</span>
            <span>Precios orientativos — verifica siempre en la tienda antes de comprar.</span>
          </div>
        </footer>
      </div>
    </AppShell>
  );
}
