'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { BudgetStatus } from '@/core/comparisons';
import type { Role } from '@/core/shared';
import { ReconciliationTable } from '@/shared/components/organisms/ReconciliationTable';
// NOTE: import directo al componente para no arrastrar HistoryListView/ComparisonDetailView
// (server components que usan Prisma y romperían el bundle client con `node:crypto`).
import { ReportsSection } from '@/features/history/ui/components/ReportsSection';
import {
  reconcilePairs,
  ReconcileError,
  type BudgetBlockedDetail,
  type PairToSend,
} from '../../lib/reconcile';

// NOTE: dynamic + ssr:false — xlsx (~300KB) y react-pdf (~1.5MB) fuera del bundle inicial y ambos dependen del DOM.
const PdfViewer = dynamic(
  () => import('../../components/FilePreview/PdfViewer'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-500">
        <span
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"
          aria-hidden
        />
        Cargando visor…
      </div>
    ),
  },
);

const ExcelViewer = dynamic(
  () => import('../../components/FilePreview/ExcelViewer'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-500">
        <span
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"
          aria-hidden
        />
        Cargando visor…
      </div>
    ),
  },
);
import {
  fileKey,
  matchFiles,
  fileKindFromName,
  type PairResult,
  type UploadKind,
} from '@/core/engine';
import { Dropzone } from '../../components/Dropzone';
import { descargarXlsx, descargarZip } from '../../lib/downloads';

interface LoadedFile {
  id: string;
  file: File;
  name: string;
  kind: UploadKind;
}
interface Pair {
  id: string;
  label: string;
  /** 1..N PDFs del mismo envío (albarán + factura + …). Vacío = incompleto. */
  pdfs: LoadedFile[];
  excel: LoadedFile | null;
}

const uid = () => crypto.randomUUID();

const ACCESS_KEY_STORAGE = 'conciliador.acceso_clave';

function toLoadedFile(file: File): LoadedFile | null {
  const kind = fileKindFromName(file.name);
  if (!kind) return null;
  return { id: uid(), file, name: file.name, kind };
}

function defaultLabel(pdfs: LoadedFile[], excel: LoadedFile | null): string {
  const base = pdfs[0]?.name ?? excel?.name ?? '';
  const key = fileKey(base);
  return key ? key.toUpperCase() : base.replace(/\.[^.]+$/, '');
}

function sanitize(s: string): string {
  return s.replace(/[\\/:*?"<>|]+/g, '').trim();
}

interface ReconcilerViewProps {
  /** null = sin límite configurado o usuario sin negocio (SUPER_ADMIN pool). */
  budgetStatus: BudgetStatus | null;
  /** null = no autenticado; sin él no se puede reportar (los CTAs de reporte no se renderizan). */
  currentUser: { id: string; role: Role } | null;
}

export function ReconcilerView({ budgetStatus, currentUser }: ReconcilerViewProps) {
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [unmatched, setUnmatched] = useState<LoadedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PairResult[] | null>(null);
  /** Snapshot de los pares enviados en compare() — sobrevive aunque el usuario edite después. */
  const [resultPairs, setResultPairs] = useState<Pair[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [accessKey, setAccessKey] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  // NOTE: si el server devuelve 402, guardamos el detalle para pintar el modal de "límite alcanzado".
  const [budgetBlocked, setBudgetBlocked] = useState<BudgetBlockedDetail | null>(
    budgetStatus?.level === 'blocked'
      ? {
          supportEmail: budgetStatus.supportEmail,
          spentUsd: budgetStatus.spentUsd,
          budgetUsd: budgetStatus.budgetUsd,
        }
      : null,
  );
  const isBudgetBlocked = budgetStatus?.level === 'blocked' || !!budgetBlocked;
  const isBudgetWarning = budgetStatus?.level === 'warning';

  // NOTE: cargamos la clave en useEffect (no en initializer) para no romper la hidratación.
  useEffect(() => {
    const saved = localStorage.getItem(ACCESS_KEY_STORAGE);
    if (saved) setAccessKey(saved);
  }, []);

  const complete = useMemo(() => pairs.filter((p) => p.pdfs.length > 0 && p.excel), [pairs]);
  const incompleteCount = pairs.length - complete.length;

  function add(files: File[]) {
    setResults(null);
    setError(null);
    const added = files.map(toLoadedFile).filter((c): c is LoadedFile => c !== null);
    if (added.length === 0) return;

    // NOTE: cálculo fuera de setState — Strict Mode reejecuta updaters y duplicaría pares.
    let { pairs: np, unmatched: ns } = matchFiles([...unmatched, ...added]);

    // NOTE: conveniencia — N PDFs + 1 Excel sin pareja por nombre se agrupan en un único par.
    let unmatchedPdfs = ns.filter((s) => s.kind === 'pdf');
    let unmatchedExcels = ns.filter((s) => s.kind === 'excel');
    if (unmatchedPdfs.length >= 1 && unmatchedExcels.length === 1) {
      np = [...np, { pdfs: unmatchedPdfs, excel: unmatchedExcels[0], key: '' }];
      ns = [];
      unmatchedPdfs = [];
      unmatchedExcels = [];
    }

    // NOTE: si hay 1 par completo + PDFs sueltos sin Excel suelto, los absorbemos (caso NESTLE.pdf + NESTLE_factura.pdf con keys distintas).
    if (
      np.length === 1 &&
      np[0].excel &&
      unmatchedPdfs.length > 0 &&
      unmatchedExcels.length === 0
    ) {
      np = [{ ...np[0], pdfs: [...np[0].pdfs, ...unmatchedPdfs] }];
      ns = ns.filter((s) => s.kind !== 'pdf');
    }

    if (np.length > 0) {
      setPairs((prev) => [
        ...prev,
        ...np.map((p) => ({
          id: uid(),
          label: defaultLabel(p.pdfs, p.excel),
          pdfs: p.pdfs,
          excel: p.excel,
        })),
      ]);
    }
    setUnmatched(ns);
  }

  function removePair(id: string) {
    setPairs((prev) => prev.filter((p) => p.id !== id));
  }

  function takePdfFromPair(pairId: string, pdfId: string) {
    const pair = pairs.find((p) => p.id === pairId);
    const taken = pair?.pdfs.find((p) => p.id === pdfId);
    if (!taken) return;
    setPairs((prev) =>
      prev.map((p) => (p.id === pairId ? { ...p, pdfs: p.pdfs.filter((x) => x.id !== pdfId) } : p)),
    );
    setUnmatched((prev) => (prev.some((s) => s.id === taken.id) ? prev : [...prev, taken]));
  }

  function takeExcelFromPair(pairId: string) {
    const pair = pairs.find((p) => p.id === pairId);
    const taken = pair?.excel;
    if (!taken) return;
    setPairs((prev) => prev.map((p) => (p.id === pairId ? { ...p, excel: null } : p)));
    setUnmatched((prev) => (prev.some((s) => s.id === taken.id) ? prev : [...prev, taken]));
  }

  function assignUnmatched(unmatchedId: string, pairId: string) {
    const item = unmatched.find((s) => s.id === unmatchedId);
    if (!item) return;
    setPairs((prev) =>
      prev.map((p) => {
        if (p.id !== pairId) return p;
        if (item.kind === 'pdf') return { ...p, pdfs: [...p.pdfs, item] };
        return { ...p, excel: item };
      }),
    );
    setUnmatched((prev) => prev.filter((s) => s.id !== unmatchedId));
  }

  function newPair(unmatchedId: string) {
    const item = unmatched.find((s) => s.id === unmatchedId);
    if (!item) return;
    const pdfs = item.kind === 'pdf' ? [item] : [];
    const excel = item.kind === 'excel' ? item : null;
    setPairs((prev) => [
      ...prev,
      { id: uid(), label: defaultLabel(pdfs, excel), pdfs, excel },
    ]);
    setUnmatched((prev) => prev.filter((s) => s.id !== unmatchedId));
  }

  function removeUnmatched(unmatchedId: string) {
    setUnmatched((prev) => prev.filter((s) => s.id !== unmatchedId));
  }

  function rename(pairId: string, label: string) {
    setPairs((prev) => prev.map((p) => (p.id === pairId ? { ...p, label } : p)));
  }

  function clear() {
    setPairs([]);
    setUnmatched([]);
    setResults(null);
    setResultPairs([]);
    setError(null);
  }

  async function runCompare(
    keyToUse?: string,
  ): Promise<'ok' | 'unauthorized' | 'blocked' | 'error'> {
    setLoading(true);
    setError(null);
    setResults(null);
    // NOTE: snapshot para que los índices del resultado sigan coincidiendo si el usuario edita.
    const snapshot = complete;
    try {
      const envio: PairToSend[] = snapshot.map((p) => ({
        label: p.label.trim() || defaultLabel(p.pdfs, p.excel) || 'Par',
        pdfs: p.pdfs.map((pdf) => pdf.file),
        xlsx: p.excel!.file,
      }));
      const { summary } = await reconcilePairs(envio);
      setResults(summary);
      setResultPairs(snapshot);
      if (keyToUse) localStorage.setItem(ACCESS_KEY_STORAGE, keyToUse);
      return 'ok';
    } catch (e) {
      if (e instanceof ReconcileError && e.status === 401) {
        localStorage.removeItem(ACCESS_KEY_STORAGE);
        return 'unauthorized';
      }
      if (
        e instanceof ReconcileError &&
        e.status === 402 &&
        e.budgetBlocked
      ) {
        setBudgetBlocked(e.budgetBlocked);
        return 'blocked';
      }
      setError(e instanceof Error ? e.message : 'Error al conciliar');
      return 'error';
    } finally {
      setLoading(false);
    }
  }

  async function compare() {
    if (complete.length === 0) return;
    if (isBudgetBlocked) {
      // NOTE: si ya sabemos server-side que está bloqueado, ni llamamos a la API.
      if (!budgetBlocked && budgetStatus) {
        setBudgetBlocked({
          supportEmail: budgetStatus.supportEmail,
          spentUsd: budgetStatus.spentUsd,
          budgetUsd: budgetStatus.budgetUsd,
        });
      }
      return;
    }
    const r = await runCompare(accessKey || undefined);
    if (r === 'unauthorized') {
      setModalError(null);
      setModalOpen(true);
    }
  }

  async function confirmKey(keyEntered: string) {
    const clean = keyEntered.trim();
    if (!clean) return;
    const r = await runCompare(clean);
    if (r === 'ok') {
      setAccessKey(clean);
      setModalOpen(false);
    } else if (r === 'unauthorized') {
      setModalError('Clave incorrecta. Inténtalo de nuevo.');
    } else {
      setModalOpen(false);
    }
  }

  const reports = (results ?? []).filter((r) => r.reportBase64);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Nueva conciliación
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Sube los albaranes (PDF) y los pedidos (Excel). Se emparejan solos
            por nombre.
          </p>
        </div>
        {complete.length > 0 && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset"
            style={{
              background: 'var(--brand-primary-soft)',
              color: 'var(--brand-accent)',
              ['--tw-ring-color' as string]: 'var(--brand-primary-ring)',
            }}
          >
            {complete.length} par{complete.length === 1 ? '' : 'es'} listo
            {complete.length === 1 ? '' : 's'}
          </span>
        )}
      </header>

      {isBudgetWarning && budgetStatus && (
        <BudgetWarningBanner status={budgetStatus} />
      )}

      <Dropzone onArchivos={add} />

      {(pairs.length > 0 || unmatched.length > 0) && (
        <section className="mt-8 space-y-6">
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pares detectados
              <span className="ml-2 font-normal text-slate-400">
                ({complete.length} de {pairs.length} listos)
              </span>
            </h2>
            {pairs.map((p) => (
              <PairRow
                key={p.id}
                pair={p}
                onTakePdf={takePdfFromPair}
                onTakeExcel={takeExcelFromPair}
                onRemove={removePair}
                onRename={rename}
              />
            ))}
            {pairs.length === 0 && (
              <p className="text-sm text-slate-500">Aún no hay pares.</p>
            )}
          </div>

          {unmatched.length > 0 && (
            <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                Sin emparejar ({unmatched.length}){' '}
                <span className="ml-1 font-normal normal-case text-amber-700">
                  — asígnalos a un par o crea uno nuevo
                </span>
              </h2>
              {unmatched.map((s) => (
                <UnmatchedRow
                  key={s.id}
                  unmatched={s}
                  pairs={pairs}
                  onAssign={assignUnmatched}
                  onNew={newPair}
                  onRemove={removeUnmatched}
                />
              ))}
            </div>
          )}

          <div className="sticky bottom-4 z-20 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur-sm">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={compare}
                disabled={loading || complete.length === 0 || isBudgetBlocked}
                title={isBudgetBlocked ? 'Se alcanzó el límite de uso mensual.' : undefined}
                className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background: 'var(--brand-primary)',
                  color: 'var(--brand-foreground)',
                }}
                onMouseEnter={(e) => {
                  if (!loading && complete.length > 0 && !isBudgetBlocked)
                    (e.currentTarget as HTMLButtonElement).style.background =
                      'var(--brand-primary-hover)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    'var(--brand-primary)';
                }}
              >
                {loading && (
                  <span
                    className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                    aria-hidden
                  />
                )}
                {loading
                  ? 'Comparando…'
                  : isBudgetBlocked
                    ? 'Límite mensual alcanzado'
                    : `Comparar ${complete.length} par${complete.length === 1 ? '' : 'es'}`}
              </button>
              <button
                type="button"
                onClick={clear}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Limpiar todo
              </button>
              {incompleteCount > 0 && (
                <span className="text-xs text-amber-700">
                  {incompleteCount} par{incompleteCount === 1 ? '' : 'es'}{' '}
                  incompleto{incompleteCount === 1 ? '' : 's'} no se comparan.
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      {error && (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {results && (
        <section className="mt-10 space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Resultados</h2>
              <p className="text-xs text-slate-500">
                {results.length} par{results.length === 1 ? '' : 'es'} procesado
                {results.length === 1 ? '' : 's'}.
              </p>
            </div>
            {reports.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  descargarZip(
                    reports.map((r) => ({
                      nombre: `${sanitize(r.label) || 'informe'}.xlsx`,
                      base64: r.reportBase64!,
                    })),
                  )
                }
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" x2="12" y1="15" y2="3" />
                </svg>
                Descargar todo (ZIP)
              </button>
            )}
          </div>
          <ul className="space-y-2">
            {results.map((r) => (
              <ResultRow
                key={r.id}
                r={r}
                sourcePair={resultPairs[r.id]}
                currentUser={currentUser}
              />
            ))}
          </ul>
        </section>
      )}

      {modalOpen && (
        <KeyModal
          loading={loading}
          error={modalError}
          onConfirm={confirmKey}
          onClose={() => setModalOpen(false)}
        />
      )}

      {budgetBlocked && (
        <BudgetBlockedModal
          detail={budgetBlocked}
          onClose={() => setBudgetBlocked(null)}
        />
      )}
    </main>
  );
}

function BudgetWarningBanner({ status }: { status: BudgetStatus }) {
  const percent = Math.round(status.percent * 100);
  return (
    <div
      role="status"
      className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <span aria-hidden className="mt-0.5 shrink-0 text-amber-600">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m10.29 3.86-8.4 14.5A2 2 0 0 0 3.62 21h16.76a2 2 0 0 0 1.73-2.64l-8.4-14.5a2 2 0 0 0-3.46 0Z" />
          <line x1="12" x2="12" y1="9" y2="13" />
          <line x1="12" x2="12.01" y1="17" y2="17" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          Estás cerca del límite de uso mensual ({percent}%).
        </p>
        <p className="mt-0.5 text-xs text-amber-800">
          Gastado ${status.spentUsd.toFixed(2)} de $
          {status.budgetUsd?.toFixed(2) ?? '—'}. Al llegar al 100% la
          conciliación se pausará hasta el siguiente mes.
        </p>
      </div>
    </div>
  );
}

function BudgetBlockedModal({
  detail,
  onClose,
}: {
  detail: BudgetBlockedDetail;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
      >
        <div className="px-6 pt-6">
          <div className="flex items-start gap-4">
            <span
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-slate-900">
                Se alcanzó el límite de uso permitido
              </h3>
              <p className="mt-1.5 text-sm text-slate-600">
                Este mes tu negocio ha consumido{' '}
                <strong className="tabular-nums text-slate-900">
                  ${detail.spentUsd.toFixed(2)}
                </strong>
                {detail.budgetUsd !== null && (
                  <>
                    {' '}
                    de{' '}
                    <strong className="tabular-nums text-slate-900">
                      ${detail.budgetUsd.toFixed(2)}
                    </strong>{' '}
                    disponibles
                  </>
                )}
                . Comunícate con el administrador para ampliar el límite o
                espera al próximo mes.
              </p>
              {detail.supportEmail && (
                <p className="mt-3 text-sm">
                  <span className="text-slate-500">Contacto:</span>{' '}
                  <a
                    href={`mailto:${detail.supportEmail}`}
                    className="font-medium underline decoration-slate-300 underline-offset-2 hover:decoration-slate-600"
                    style={{ color: 'var(--brand-primary)' }}
                  >
                    {detail.supportEmail}
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2 rounded-b-2xl border-t border-slate-100 bg-slate-50 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

function KeyModal({
  loading,
  error,
  onConfirm,
  onClose,
}: {
  loading: boolean;
  error: string | null;
  onConfirm: (key: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-clave-titulo"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm(value);
        }}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{
              background: 'var(--brand-primary-soft)',
              color: 'var(--brand-primary)',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </span>
          <div className="min-w-0">
            <h2
              id="modal-clave-titulo"
              className="text-lg font-semibold text-slate-900"
            >
              Clave de acceso
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Introduce la clave para usar el conciliador. Se recordará en este
              equipo.
            </p>
          </div>
        </div>

        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Clave de acceso"
          aria-label="Clave de acceso"
          autoFocus
          autoComplete="current-password"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2"
          style={{
            ['--tw-ring-color' as string]: 'var(--brand-primary-ring)',
          }}
        />

        {error && (
          <p className="mt-2 text-sm font-medium text-red-600">{error}</p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || value.trim().length === 0}
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: 'var(--brand-primary)',
              color: 'var(--brand-foreground)',
            }}
            onMouseEnter={(e) => {
              if (!loading && value.trim().length > 0)
                (e.currentTarget as HTMLButtonElement).style.background =
                  'var(--brand-primary-hover)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                'var(--brand-primary)';
            }}
          >
            {loading && (
              <span
                className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
                aria-hidden
              />
            )}
            {loading ? 'Comprobando…' : 'Entrar y comparar'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Chip({ name, kind, onRemove }: { name: string; kind: UploadKind; onRemove?: () => void }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-sm">
      <span className={`rounded px-1 text-xs font-bold ${kind === 'pdf' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
        {kind === 'pdf' ? 'PDF' : 'XLS'}
      </span>
      <span className="min-w-0 truncate">{name}</span>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label="Quitar" className="text-slate-400 hover:text-red-500">
          ×
        </button>
      )}
    </span>
  );
}

function Slot({ kind }: { kind: UploadKind }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-2.5 py-1 text-sm text-slate-400">
      Falta {kind === 'pdf' ? 'el albarán (PDF)' : 'el pedido (Excel)'}
    </span>
  );
}

function PairRow({
  pair,
  onTakePdf,
  onTakeExcel,
  onRemove,
  onRename,
}: {
  pair: Pair;
  onTakePdf: (pairId: string, pdfId: string) => void;
  onTakeExcel: (pairId: string) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, label: string) => void;
}) {
  const isComplete = pair.pdfs.length > 0 && pair.excel;
  return (
    <div className={`rounded-2xl border bg-white p-3 ${isComplete ? 'border-slate-200' : 'border-amber-300'}`}>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-lg" aria-hidden="true">
          {isComplete ? '🔗' : '⚠️'}
        </span>
        <label
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 focus-within:border-transparent focus-within:bg-white focus-within:ring-2"
          style={{
            ['--tw-ring-color' as string]: 'var(--brand-primary-ring)',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate-400" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
          <input
            value={pair.label}
            onChange={(e) => onRename(pair.id, e.target.value)}
            placeholder="Nombre del par (clic para editar)"
            aria-label="Nombre del par"
            className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-800 placeholder:font-normal placeholder:text-slate-400 focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() => onRemove(pair.id)}
          aria-label="Eliminar par"
          title="Eliminar par"
          className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" x2="10" y1="11" y2="17" />
            <line x1="14" x2="14" y1="11" y2="17" />
          </svg>
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {pair.pdfs.length === 0 ? (
          <Slot kind="pdf" />
        ) : (
          pair.pdfs.map((pdf) => (
            <Chip
              key={pdf.id}
              name={pdf.name}
              kind="pdf"
              onRemove={() => onTakePdf(pair.id, pdf.id)}
            />
          ))
        )}
        {pair.excel ? (
          <Chip name={pair.excel.name} kind="excel" onRemove={() => onTakeExcel(pair.id)} />
        ) : (
          <Slot kind="excel" />
        )}
      </div>
      {pair.pdfs.length > 1 && (
        <p className="mt-2 text-xs text-slate-500">
          🔀 Los {pair.pdfs.length} PDFs se fusionarán en un único informe (albarán + factura del mismo envío).
        </p>
      )}
    </div>
  );
}

function UnmatchedRow({
  unmatched,
  pairs,
  onAssign,
  onNew,
  onRemove,
}: {
  unmatched: LoadedFile;
  pairs: Pair[];
  onAssign: (unmatchedId: string, pairId: string) => void;
  onNew: (unmatchedId: string) => void;
  onRemove: (unmatchedId: string) => void;
}) {
  // NOTE: para Excels solo pares sin Excel; PDFs pueden ir a cualquier par.
  const available = pairs.filter((p) => (unmatched.kind === 'pdf' ? true : !p.excel));
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip name={unmatched.name} kind={unmatched.kind} />
      <select
        defaultValue=""
        onChange={(e) => {
          const v = e.target.value;
          if (v === '__nuevo') onNew(unmatched.id);
          else if (v) onAssign(unmatched.id, v);
          e.currentTarget.value = '';
        }}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
      >
        <option value="" disabled>
          Mover a…
        </option>
        <option value="__nuevo">Nuevo par</option>
        {available.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label || `Par ${pairs.indexOf(p) + 1}`}
          </option>
        ))}
      </select>
      <button type="button" onClick={() => onRemove(unmatched.id)} className="text-sm text-slate-400 hover:text-red-500">
        Descartar
      </button>
    </div>
  );
}

function ResultRow({
  r,
  sourcePair,
  currentUser,
}: {
  r: PairResult;
  sourcePair?: Pair;
  currentUser: { id: string; role: Role } | null;
}) {
  const [open, setOpen] = useState(false);
  const [filesOpen, setFilesOpen] = useState(false);
  const style =
    r.status === 'OK'
      ? 'bg-green-100 text-green-700'
      : r.status === 'DISCREPANCIES'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-red-100 text-red-700';
  const text =
    r.status === 'OK'
      ? '✅ Todo coincide'
      : r.status === 'DISCREPANCIES'
        ? `⚠️ ${r.numDiscrepancies} discrepancia${r.numDiscrepancies === 1 ? '' : 's'}`
        : '⛔ Error';

  const downloadName = `${sanitize(r.label) || 'informe'}.xlsx`;

  const sourceFiles = sourcePair
    ? [
        ...sourcePair.pdfs.map((p) => ({ name: p.name, file: p.file, kind: 'pdf' as const })),
        ...(sourcePair.excel
          ? [
              {
                name: sourcePair.excel.name,
                file: sourcePair.excel.file,
                kind: 'excel' as const,
              },
            ]
          : []),
      ]
    : [];

  return (
    <li className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{r.label || r.supplier}</p>
          {r.supplier && r.label !== r.supplier && (
            <p className="truncate text-xs text-slate-500">Proveedor detectado: {r.supplier}</p>
          )}
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${style}`}>{text}</span>
        {sourceFiles.length > 0 && (
          <button
            type="button"
            onClick={() => setFilesOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            title="Ver los PDFs y el Excel que se subieron"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Ver archivos ({sourceFiles.length})
          </button>
        )}
        {r.detail && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold hover:bg-slate-50"
          >
            {open ? 'Ocultar' : 'Previsualizar'}
          </button>
        )}
        {r.reportBase64 && (
          <button
            type="button"
            onClick={() => descargarXlsx(downloadName, r.reportBase64!)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold hover:bg-slate-50"
          >
            Descargar
          </button>
        )}
      </div>

      {filesOpen && sourceFiles.length > 0 && (
        <FilePreviewModal
          files={sourceFiles}
          onClose={() => setFilesOpen(false)}
        />
      )}
      {r.error && (
        <div className="border-t border-red-100 bg-red-50 px-4 py-3">
          <div className="flex items-start gap-2.5">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 shrink-0 text-red-500"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" x2="12" y1="8" y2="12" />
              <line x1="12" x2="12.01" y1="16" y2="16" />
            </svg>
            <p className="text-sm leading-relaxed text-red-800">{r.error}</p>
          </div>
        </div>
      )}
      {open && r.detail && <ReconciliationTable lines={r.detail.lines} />}
      {open && r.detail?.rawLines && r.detail.rawLines.length > 0 && (
        <ExtractionDebug lines={r.detail.rawLines} />
      )}

      {/* Reportes de esta conciliación — visible en cuanto la comparación se persiste.
          El botón deja una nota que el super admin verá y podrá resolver. */}
      {r.comparisonId && currentUser && (
        <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-4">
          <ReportsSection
            comparisonId={r.comparisonId}
            initialReports={[]}
            currentUser={currentUser}
          />
        </div>
      )}
    </li>
  );
}

function ExtractionDebug({ lines }: { lines: NonNullable<PairResult['detail']>['rawLines'] }) {
  if (!lines) return null;
  return (
    <details className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs">
      <summary className="cursor-pointer font-semibold text-slate-500">
        🔎 Ver lo que leyó Gemini del PDF ({lines.length} líneas) — debug
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="text-left text-slate-400">
              <th className="px-2 py-1">C.N.</th>
              <th className="px-2 py-1">EAN</th>
              <th className="px-2 py-1">Descripción</th>
              <th className="px-2 py-1 text-right">UDS</th>
              <th className="px-2 py-1 text-right">PVL</th>
              <th className="px-2 py-1 text-right">DTO</th>
              <th className="px-2 py-1 text-right">BONIF</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {lines.map((l, i) => (
              <tr key={i} className="border-t border-slate-200">
                <td className="px-2 py-1">{l.nationalCode || l.code || '—'}</td>
                <td className="px-2 py-1">{l.ean || '—'}</td>
                <td className="px-2 py-1 font-sans">{l.description}</td>
                <td className="px-2 py-1 text-right">{l.quantity}</td>
                <td className="px-2 py-1 text-right">{l.unitPrice}</td>
                <td className="px-2 py-1 text-right">{l.discount ?? 0}</td>
                <td className="px-2 py-1 text-right">{l.freeUnits ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}


interface PreviewFile {
  name: string;
  file: File;
  kind: UploadKind;
}

function FilePreviewModal({
  files,
  onClose,
}: {
  files: PreviewFile[];
  onClose: () => void;
}) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const selected = files[selectedIdx];

  useEffect(() => {
    if (!selected) return;
    const url = URL.createObjectURL(selected.file);
    setBlobUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selected]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  function downloadCurrent() {
    if (!selected || !blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = selected.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function openInNewTab() {
    if (!blobUrl) return;
    window.open(blobUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="file-preview-title"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2
            id="file-preview-title"
            className="truncate text-sm font-semibold text-slate-900"
          >
            {selected?.name}
          </h2>
          <div className="flex shrink-0 items-center gap-2">
            {selected?.kind === 'pdf' && (
              <button
                type="button"
                onClick={openInNewTab}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                title="Abrir en pestaña nueva"
              >
                Abrir en pestaña
              </button>
            )}
            <button
              type="button"
              onClick={downloadCurrent}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Descargar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Cerrar"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        </div>

        {files.length > 1 && (
          <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 px-2 py-2 md:hidden">
            {files.map((f, i) => {
              const active = i === selectedIdx;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedIdx(i)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${
                    active
                      ? 'border-slate-300 bg-white text-slate-900 shadow-sm'
                      : 'border-transparent text-slate-500 hover:bg-white/50'
                  }`}
                >
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      f.kind === 'pdf'
                        ? 'bg-red-100 text-red-600'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {f.kind === 'pdf' ? 'PDF' : 'XLS'}
                  </span>
                  <span className="max-w-[140px] truncate">{f.name}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          {files.length > 1 && (
            <aside className="hidden w-52 shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50 p-2 md:block">
              <p className="mb-1 px-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Archivos ({files.length})
              </p>
              {files.map((f, i) => {
                const active = i === selectedIdx;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedIdx(i)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs ${
                      active ? 'bg-white shadow-sm' : 'hover:bg-white/50'
                    }`}
                  >
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        f.kind === 'pdf'
                          ? 'bg-red-100 text-red-600'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {f.kind === 'pdf' ? 'PDF' : 'XLS'}
                    </span>
                    <span className="min-w-0 truncate text-slate-700">
                      {f.name}
                    </span>
                  </button>
                );
              })}
            </aside>
          )}

          <div className="flex-1 overflow-hidden bg-slate-100">
            {selected?.kind === 'pdf' ? (
              <PdfViewer key={selected.name} file={selected.file} />
            ) : selected?.kind === 'excel' ? (
              <ExcelViewer key={selected.name} file={selected.file} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                Cargando…
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

