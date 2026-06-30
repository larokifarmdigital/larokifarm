'use client';

import { useEffect, useMemo, useState } from 'react';
import { reconcilePairs, ReconcileError, type PairToSend } from '../../lib/reconcile';
import {
  fileKey,
  matchFiles,
  statusText,
  fileKindFromName,
  type ReconciledLine,
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
  /** 1..N PDFs del MISMO envío (albarán + factura + …). Vacío = par incompleto. */
  pdfs: LoadedFile[];
  excel: LoadedFile | null;
}

const uid = () => crypto.randomUUID();

/** Clave de acceso recordada en el navegador del cliente (persiste tras F5 / reabrir). */
const ACCESS_KEY_STORAGE = 'conciliador.acceso_clave';

function toLoadedFile(file: File): LoadedFile | null {
  const kind = fileKindFromName(file.name);
  if (!kind) return null;
  return { id: uid(), file, name: file.name, kind };
}

/** Nombre por defecto del par: clave compartida, o nombre del primer archivo sin extensión. */
function defaultLabel(pdfs: LoadedFile[], excel: LoadedFile | null): string {
  const base = pdfs[0]?.name ?? excel?.name ?? '';
  const key = fileKey(base);
  return key ? key.toUpperCase() : base.replace(/\.[^.]+$/, '');
}

function sanitize(s: string): string {
  return s.replace(/[\\/:*?"<>|]+/g, '').trim();
}

export function ReconcilerView() {
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [unmatched, setUnmatched] = useState<LoadedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PairResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accessKey, setAccessKey] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Cargar la clave guardada tras el montaje (en useEffect, no en el initializer,
  // para no provocar un desajuste de hidratación con el render del servidor).
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

    // Se calcula fuera de los updaters (nunca un setState dentro de otro: React
    // ejecuta los updaters dos veces en dev y duplicaría los pares).
    let { pairs: np, unmatched: ns } = matchFiles([...unmatched, ...added]);

    // Conveniencia: si lo que queda suelto es N PDFs y exactamente 1 Excel sin
    // pareja por nombre, los agrupamos en un único par (caso típico: subes los
    // 2 PDFs de un proveedor + su Excel con nombres que no comparten clave).
    const unmatchedPdfs = ns.filter((s) => s.kind === 'pdf');
    const unmatchedExcels = ns.filter((s) => s.kind === 'excel');
    if (unmatchedPdfs.length >= 1 && unmatchedExcels.length === 1) {
      np = [...np, { pdfs: unmatchedPdfs, excel: unmatchedExcels[0], key: '' }];
      ns = [];
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

  // Sacar un PDF concreto de un par → vuelve a "sueltos".
  function takePdfFromPair(pairId: string, pdfId: string) {
    const pair = pairs.find((p) => p.id === pairId);
    const taken = pair?.pdfs.find((p) => p.id === pdfId);
    if (!taken) return;
    setPairs((prev) =>
      prev.map((p) => (p.id === pairId ? { ...p, pdfs: p.pdfs.filter((x) => x.id !== pdfId) } : p)),
    );
    setUnmatched((prev) => (prev.some((s) => s.id === taken.id) ? prev : [...prev, taken]));
  }

  // Sacar el Excel de un par → vuelve a "sueltos".
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
    setError(null);
  }

  // Ejecuta la conciliación con la clave indicada. Devuelve el desenlace para que
  // quien llama decida la UI (abrir el modal, mostrar error en el modal, etc.).
  async function runCompare(keyToUse?: string): Promise<'ok' | 'unauthorized' | 'error'> {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const envio: PairToSend[] = complete.map((p) => ({
        label: p.label.trim() || defaultLabel(p.pdfs, p.excel) || 'Par',
        pdfs: p.pdfs.map((pdf) => pdf.file),
        xlsx: p.excel!.file,
      }));
      const { summary } = await reconcilePairs(envio);
      setResults(summary);
      // La clave funcionó (no hubo 401) → recordarla para no volver a pedirla.
      if (keyToUse) localStorage.setItem(ACCESS_KEY_STORAGE, keyToUse);
      return 'ok';
    } catch (e) {
      if (e instanceof ReconcileError && e.status === 401) {
        // La clave guardada ya no sirve (o no había): bórrala y pídela.
        localStorage.removeItem(ACCESS_KEY_STORAGE);
        return 'unauthorized';
      }
      setError(e instanceof Error ? e.message : 'Error al conciliar');
      return 'error';
    } finally {
      setLoading(false);
    }
  }

  async function compare() {
    if (complete.length === 0) return;
    const r = await runCompare(accessKey || undefined);
    if (r === 'unauthorized') {
      setModalError(null);
      setModalOpen(true);
    }
  }

  // Reintenta con la clave tecleada en el modal.
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
      // Error distinto (red, servidor): cierra el modal y muestra el error general.
      setModalOpen(false);
    }
  }

  const reports = (results ?? []).filter((r) => r.reportBase64);

  return (
    <main className="mx-auto max-w-[1440px] px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Conciliador de Albaranes</h1>
        <p className="mt-2 text-slate-600">
          Sube los albaranes (PDF) y los pedidos (Excel), empareja y compara.
        </p>
      </header>

      <Dropzone onArchivos={add} />

      {(pairs.length > 0 || unmatched.length > 0) && (
        <section className="mt-8 space-y-6">
          <div className="space-y-3">
            <h2 className="text-sm font-bold tracking-wide text-slate-500 uppercase">
              Pares ({complete.length} listo{complete.length === 1 ? '' : 's'})
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
            {pairs.length === 0 && <p className="text-sm text-slate-500">Aún no hay pares.</p>}
          </div>

          {unmatched.length > 0 && (
            <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <h2 className="text-sm font-bold text-amber-700">
                Sin emparejar ({unmatched.length}) — asígnalos a un par o crea uno nuevo
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

          <div className="flex flex-wrap items-center gap-4 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={compare}
              disabled={loading || complete.length === 0}
              className="rounded-lg bg-sky-600 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Comparando…' : `Comparar ${complete.length} par${complete.length === 1 ? '' : 'es'}`}
            </button>
            <button type="button" onClick={clear} className="text-sm text-slate-500 hover:text-slate-700">
              Limpiar todo
            </button>
            {incompleteCount > 0 && (
              <span className="text-sm text-amber-600">
                {incompleteCount} par(es) incompleto(s) no se compararán.
              </span>
            )}
          </div>
        </section>
      )}

      {error && (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {results && (
        <section className="mt-10 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Resultados</h2>
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
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                Descargar todo (ZIP)
              </button>
            )}
          </div>
          <ul className="space-y-2">
            {results.map((r) => (
              <ResultRow key={r.id} r={r} />
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
    </main>
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

  // Cerrar con Escape.
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
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </span>
          <div className="min-w-0">
            <h2 id="modal-clave-titulo" className="text-lg font-bold text-slate-900">
              Clave de acceso
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Introduce la clave para usar el conciliador. Se recordará en este equipo.
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
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none"
        />

        {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}

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
            className="rounded-lg bg-sky-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
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
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 focus-within:border-sky-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-100">
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
  // Para PDFs: cualquier par (puede llevar varios). Para Excels: solo pares sin Excel.
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

function ResultRow({ r }: { r: PairResult }) {
  const [open, setOpen] = useState(false);
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
      {open && r.detail && <DetailTable lines={r.detail.lines} />}
      {open && r.detail?.rawLines && r.detail.rawLines.length > 0 && (
        <ExtractionDebug lines={r.detail.rawLines} />
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

function cell(v: number | null): string {
  return v === null ? '—' : String(v);
}

const TH = 'px-3 py-2.5 font-semibold whitespace-nowrap';

function DetailTable({ lines }: { lines: ReconciledLine[] }) {
  // Resalta el par de celdas (pedido/albarán) cuando ese campo es la discrepancia.
  const mark = (l: ReconciledLine, field: 'units' | 'price' | 'discount') =>
    l.discrepancies.includes(field) ? 'bg-red-200 font-bold text-red-800' : '';

  return (
    <div className="overflow-x-auto border-t border-slate-200">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="bg-slate-800 text-left text-xs tracking-wide text-white uppercase">
            <th className={TH}>Código</th>
            <th className={TH}>Descripción</th>
            <th className={`${TH} text-right`}>Uds ped.</th>
            <th className={`${TH} text-right`}>Uds alb.</th>
            <th className={`${TH} text-right`}>Bonif.</th>
            <th className={`${TH} text-right`}>Precio ped.</th>
            <th className={`${TH} text-right`}>Precio alb.</th>
            <th className={`${TH} text-right`}>Dto ped.</th>
            <th className={`${TH} text-right`}>Dto alb.</th>
            <th className={TH}>Estado / motivo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {lines.map((l) => {
            const badRow = l.status !== 'OK';
            return (
              <tr key={l.nationalCode} className={badRow ? 'bg-red-50' : 'odd:bg-white even:bg-slate-50/60'}>
                <td className="px-3 py-2 font-medium">{l.nationalCode}</td>
                <td className="px-3 py-2">{l.description}</td>
                <td className={`px-3 py-2 text-right ${mark(l, 'units')}`}>{cell(l.unitsOrdered)}</td>
                <td className={`px-3 py-2 text-right ${mark(l, 'units')}`}>{cell(l.unitsDelivered)}</td>
                <td className="px-3 py-2 text-right text-emerald-700">
                  {l.freeUnitsDelivered ? `+${l.freeUnitsDelivered}` : '—'}
                </td>
                <td className={`px-3 py-2 text-right ${mark(l, 'price')}`}>{cell(l.priceOrdered)}</td>
                <td className={`px-3 py-2 text-right ${mark(l, 'price')}`}>{cell(l.priceDelivered)}</td>
                <td className={`px-3 py-2 text-right ${mark(l, 'discount')}`}>{cell(l.discountOrdered)}</td>
                <td className={`px-3 py-2 text-right ${mark(l, 'discount')}`}>{cell(l.discountDelivered)}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      l.status === 'OK'
                        ? 'bg-green-100 text-green-700'
                        : l.status === 'DISCREPANCY'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {statusText(l)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
