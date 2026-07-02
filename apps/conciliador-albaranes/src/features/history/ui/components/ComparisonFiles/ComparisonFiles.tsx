'use client';

import { useState } from 'react';
import { formatBytes } from '@/shared/lib/format';
import type { ReconciledLine } from '@/core/engine';
import { ReconciliationTable } from '@/shared/components/organisms/ReconciliationTable';
import {
  FileHistoryModal,
  type HistoryFileItem,
} from '../FileHistoryModal';

export interface ComparisonFileView {
  id: string;
  filename: string;
  kindLabel: string;
  kind: 'pdf' | 'excel' | 'other';
  sizeBytes: number;
  downloadUrl: string;
  /** Si true, se renderiza inline como preview del informe generado. */
  isReport?: boolean;
}

export function ComparisonFiles({
  files,
  reconciliationLines,
}: {
  files: ComparisonFileView[];
  /** Si se pasan, se muestra la tabla maquetada (misma UI que tras comparar). */
  reconciliationLines?: ReconciledLine[];
}) {
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const [reportOpen, setReportOpen] = useState(true);

  const previewables = files.filter(
    (f) => f.kind === 'pdf' || f.kind === 'excel',
  );

  const hasLines = reconciliationLines && reconciliationLines.length > 0;
  const report = hasLines ? files.find((f) => f.isReport) : undefined;

  const modalFiles: HistoryFileItem[] = previewables.map((f) => ({
    name: f.filename,
    url: f.downloadUrl,
    kind: f.kind,
  }));

  function openPreview(fileId: string) {
    const idx = previewables.findIndex((f) => f.id === fileId);
    if (idx >= 0) setPreviewIdx(idx);
  }

  return (
    <div className="space-y-4">
      {/* Preview inline del informe */}
      {report && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Previsualización del informe
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                {report.filename}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setReportOpen((v) => !v)}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {reportOpen ? 'Ocultar' : 'Mostrar'}
              </button>
              <a
                href={report.downloadUrl}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold shadow-sm"
                style={{
                  background: 'var(--brand-primary)',
                  color: 'var(--brand-foreground)',
                }}
              >
                <DownloadIcon />
                Descargar
              </a>
            </div>
          </div>
          {reportOpen && hasLines && (
            <div className="max-h-[560px] overflow-auto">
              <ReconciliationTable lines={reconciliationLines!} />
            </div>
          )}
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Todos los archivos ({files.length})
          </h2>
        </div>

      {files.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-500">
          No hay archivos asociados (probablemente esta comparación falló antes
          de generar el informe).
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <FileIcon kind={f.kind} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {f.filename}
                  </p>
                  <p className="text-xs text-slate-500">
                    {f.kindLabel} · {formatBytes(f.sizeBytes)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {(f.kind === 'pdf' || f.kind === 'excel') && (
                  <button
                    type="button"
                    onClick={() => openPreview(f.id)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <EyeIcon />
                    Ver
                  </button>
                )}
                <a
                  href={f.downloadUrl}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold shadow-sm"
                  style={{
                    background: 'var(--brand-primary)',
                    color: 'var(--brand-foreground)',
                  }}
                >
                  <DownloadIcon />
                  Descargar
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}

      </section>

      {previewIdx !== null && (
        <FileHistoryModal
          files={modalFiles}
          initialIdx={previewIdx}
          onClose={() => setPreviewIdx(null)}
        />
      )}
    </div>
  );
}

function FileIcon({ kind }: { kind: 'pdf' | 'excel' | 'other' }) {
  const cls =
    kind === 'pdf'
      ? 'bg-red-100 text-red-600'
      : kind === 'excel'
        ? 'bg-green-100 text-green-700'
        : 'bg-slate-200 text-slate-600';
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cls}`}
      aria-hidden
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
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    </span>
  );
}

function EyeIcon() {
  return (
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
  );
}

function DownloadIcon() {
  return (
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}
