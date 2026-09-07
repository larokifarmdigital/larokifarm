'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import type { ComparisonReport } from '@/core/domain/models';
import { compareAction, type CompareActionState } from '@/ui/actions/compareAction';
import { ThemeToggle } from '@/ui/components/ThemeToggle';
import { BarcodeScanner } from './BarcodeScanner';
import { CompareForm } from './CompareForm';
import { ComparisonTable } from './ComparisonTable';
import { MedicamentoInfoCard } from './MedicamentoInfoCard';
import { PinnedComparison } from './PinnedComparison';
import { RecentSearches } from './RecentSearches';
import { ShareButton } from './ShareButton';
import { pushSearchHistory } from './hooks/useSearchHistory';
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
    <div className="animate-pulse rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 shrink-0 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-3 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800" />
        </div>
        <div className="space-y-2 text-right">
          <div className="ml-auto h-6 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="ml-auto h-3 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}

function ScoutLogo({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
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
    });

    replaceUrlSearchParams({
      cn: state.result.input.cn,
      ean: state.result.input.ean,
      nombre: state.result.input.nombreHint ?? state.result.input.nombre,
    });
  }, [state]);

  function handleSuggestionClick(name: string) {
    setPrefilled({ nombre: name });
    setTimeout(() => fillAndSubmit(undefined, undefined, name), 30);
  }

  function handleHistoryPick(entry: { cn?: string; ean?: string; nombre?: string }) {
    setPrefilled(entry);
    setTimeout(() => fillAndSubmit(entry.cn, entry.ean, entry.nombre), 30);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleNewSearch() {
    setPrefilled({});
    const form = document.querySelector<HTMLFormElement>('form');
    form?.reset();
    replaceUrlSearchParams({});
    savedResultsRef.current = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => document.getElementById('nombre')?.focus(), 300);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/60 via-white to-white dark:from-teal-950/20 dark:via-zinc-950 dark:to-zinc-950">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Header */}
        <header className="mb-8 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm ring-1 ring-teal-700/20">
            <ScoutLogo />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Scout
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Comparador de precios farmacéuticos
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500 bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-400"
              title="Escanear código de barras con la cámara"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 5v14M8 5v14M12 5v14M17 5v14M21 5v14" />
              </svg>
              <span className="hidden sm:inline">Escanear</span>
            </button>
            <ThemeToggle />
          </div>
        </header>

        {/* Modal escáner */}
        <BarcodeScanner
          isOpen={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onDetected={(ean) => {
            setScannerOpen(false);
            setPrefilled({ ean });
            setTimeout(() => fillAndSubmit(undefined, ean, undefined), 30);
          }}
        />

        {/* Card principal con introducción + form */}
        <section className="mb-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="border-b border-zinc-100 bg-gradient-to-br from-teal-50/40 to-white p-6 dark:border-zinc-800 dark:from-teal-950/10 dark:to-zinc-950 sm:p-8">
            <div className="max-w-2xl">
              <h2 className="text-lg font-semibold leading-tight text-zinc-900 dark:text-zinc-50 sm:text-xl">
                Compará precios en decenas de farmacias online españolas
              </h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Ingresá el <strong>Código Nacional</strong>, <strong>EAN</strong> o el{' '}
                <strong>nombre exacto</strong> del producto. Buscamos en tiempo real en Google
                Shopping y en las fichas indexadas por Google.
              </p>
            </div>
          </div>
          <div className="p-6 sm:p-8">
            <CompareForm
              action={formAction}
              defaultCn={prefilled.cn}
              defaultEan={prefilled.ean}
              defaultNombre={prefilled.nombre}
            />
          </div>
        </section>

        {/* Loading */}
        {isPending && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-teal-200 bg-teal-50/70 px-4 py-3 text-sm text-teal-800 dark:border-teal-900/50 dark:bg-teal-950/30 dark:text-teal-200">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-teal-400/60 border-t-teal-700 dark:border-teal-700 dark:border-t-teal-200" />
              Buscando precios en decenas de farmacias…{' '}
              <span className="text-teal-600/80 dark:text-teal-400/80">(15–45s)</span>
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
          <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-5 dark:border-rose-900/50 dark:from-rose-950/30 dark:to-zinc-950">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-rose-900 dark:text-rose-100">
                  No se pudo completar la búsqueda
                </p>
                <p className="mt-1 text-sm text-rose-700 dark:text-rose-300">{state.error}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const form = document.querySelector<HTMLFormElement>('form');
                      form?.requestSubmit();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-400"
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
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:bg-zinc-900 dark:text-rose-300 dark:hover:bg-zinc-800"
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

        {/* Resultados */}
        {!isPending && state.status === 'done' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Resultados
              </h3>
              <div className="flex items-center gap-2">
                {(() => {
                  const isPinned = isReportPinned(pinnedReports, state.result);
                  return (
                    <button
                      type="button"
                      disabled={isPinned}
                      onClick={() => setPinnedReports((prev) => [...prev, state.result])}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        isPinned
                          ? 'cursor-not-allowed border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900/50 dark:bg-teal-950/30 dark:text-teal-400'
                          : 'border-teal-500 bg-teal-600 text-white hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-400'
                      }`}
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
                  );
                })()}
                <ShareButton
                  input={{
                    cn: state.result.input.cn,
                    ean: state.result.input.ean,
                    nombre: state.result.input.nombreHint ?? state.result.input.nombre,
                  }}
                />
                <button
                  type="button"
                  onClick={handleNewSearch}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-teal-400 hover:text-teal-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-teal-600 dark:hover:text-teal-300"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Nueva búsqueda
                </button>
              </div>
            </div>
            {/* Info CIMA solo si el user buscó por CN */}
            {state.result.input.cn && <MedicamentoInfoCard cn={state.result.input.cn} />}
            <ComparisonTable report={state.result} />
          </div>
        )}

        {/* Empty state: productos sugeridos + historial */}
        {!isPending && state.status === 'idle' && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/70 p-8 text-center dark:border-zinc-700 dark:bg-zinc-950/40">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Empezá con una búsqueda
              </p>
              <p className="mx-auto mt-1 max-w-md text-xs text-zinc-500 dark:text-zinc-500">
                Escribí un producto en el formulario o probá con alguna de las sugerencias:
              </p>
            </div>

            {/* Búsquedas recientes (solo aparece si el user ya buscó antes) */}
            <RecentSearches onPick={handleHistoryPick} />

            <div>
              <div className="mb-2 flex items-baseline justify-between px-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
                  Búsquedas populares
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {SUGGESTED_PRODUCTS.map((p) => (
                  <button
                    key={p.nombre}
                    type="button"
                    onClick={() => handleSuggestionClick(p.nombre)}
                    className="group flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-left transition-all hover:border-teal-400 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-teal-600"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600 group-hover:bg-teal-100 dark:bg-teal-950/40 dark:text-teal-400">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.5 20.5 3.5 13.5a5 5 0 0 1 0-7.07l0 0a5 5 0 0 1 7.07 0L20.5 16.5a3 3 0 0 1 0 4.24l0 0a3 3 0 0 1-4.24 0z" />
                        <path d="m8.5 8.5 7 7" />
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {p.nombre}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
                        {p.categoria}
                      </div>
                    </div>
                    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-zinc-400 group-hover:translate-x-0.5 group-hover:text-teal-600 dark:text-zinc-600 dark:group-hover:text-teal-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 6 6 6-6 6" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <footer className="mt-12 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <div className="flex flex-col items-center justify-between gap-2 text-[11px] text-zinc-400 sm:flex-row dark:text-zinc-600">
            <span>Datos en tiempo real de Google Shopping + Google Search.</span>
            <span>Precios orientativos — verificá siempre en la tienda antes de comprar.</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
