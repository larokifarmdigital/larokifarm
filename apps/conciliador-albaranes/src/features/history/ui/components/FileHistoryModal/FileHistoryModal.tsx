'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// NOTE: dynamic import para no engordar el bundle inicial del historial.
const PdfViewer = dynamic(
  () =>
    import(
      '@/features/reconciler/ui/components/FilePreview/PdfViewer'
    ),
  {
    ssr: false,
    loading: () => <ViewerLoader />,
  },
);

const ExcelViewer = dynamic(
  () =>
    import(
      '@/features/reconciler/ui/components/FilePreview/ExcelViewer'
    ),
  {
    ssr: false,
    loading: () => <ViewerLoader />,
  },
);

export interface HistoryFileItem {
  name: string;
  url: string;
  kind: 'pdf' | 'excel' | 'other';
}

export function FileHistoryModal({
  files,
  initialIdx,
  onClose,
}: {
  files: HistoryFileItem[];
  initialIdx: number;
  onClose: () => void;
}) {
  const [selectedIdx, setSelectedIdx] = useState(initialIdx);
  const selected = files[selectedIdx];

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

  function openInNewTab() {
    if (selected?.url) window.open(selected.url, '_blank', 'noopener,noreferrer');
  }

  function download() {
    if (!selected) return;
    const a = document.createElement('a');
    a.href = selected.url;
    a.download = selected.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <h2 className="truncate text-sm font-semibold text-slate-900">
            {selected?.name ?? 'Archivo'}
          </h2>
          <div className="flex shrink-0 items-center gap-2">
            {selected?.kind === 'pdf' && (
              <button
                type="button"
                onClick={openInNewTab}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Abrir en pestaña
              </button>
            )}
            <button
              type="button"
              onClick={download}
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
              <CloseIcon />
            </button>
          </div>
        </div>

        {files.length > 1 && (
          <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 px-2 py-2 md:hidden">
            {files.map((f, i) => (
              <FileChip
                key={i}
                file={f}
                active={i === selectedIdx}
                onClick={() => setSelectedIdx(i)}
              />
            ))}
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          {files.length > 1 && (
            <aside className="hidden w-52 shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50 p-2 md:block">
              <p className="mb-1 px-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Archivos ({files.length})
              </p>
              {files.map((f, i) => (
                <FileSidebarItem
                  key={i}
                  file={f}
                  active={i === selectedIdx}
                  onClick={() => setSelectedIdx(i)}
                />
              ))}
            </aside>
          )}

          <div className="flex-1 overflow-hidden bg-slate-100">
            {selected?.kind === 'pdf' ? (
              <PdfViewer key={selected.url} file={selected.url} />
            ) : selected?.kind === 'excel' ? (
              <ExcelViewer key={selected.url} file={selected.url} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-slate-500">
                <p>Este tipo de archivo no tiene visor.</p>
                <button
                  type="button"
                  onClick={download}
                  className="rounded-md px-4 py-2 text-sm font-medium shadow-sm"
                  style={{
                    background: 'var(--brand-primary)',
                    color: 'var(--brand-foreground)',
                  }}
                >
                  Descargar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FileChip({
  file,
  active,
  onClick,
}: {
  file: HistoryFileItem;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${
        active
          ? 'border-slate-300 bg-white text-slate-900 shadow-sm'
          : 'border-transparent text-slate-500 hover:bg-white/50'
      }`}
    >
      <KindBadge kind={file.kind} />
      <span className="max-w-[140px] truncate">{file.name}</span>
    </button>
  );
}

function FileSidebarItem({
  file,
  active,
  onClick,
}: {
  file: HistoryFileItem;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs ${
        active ? 'bg-white shadow-sm' : 'hover:bg-white/50'
      }`}
    >
      <KindBadge kind={file.kind} />
      <span className="min-w-0 truncate text-slate-700">{file.name}</span>
    </button>
  );
}

function KindBadge({ kind }: { kind: HistoryFileItem['kind'] }) {
  const label = kind === 'pdf' ? 'PDF' : kind === 'excel' ? 'XLS' : 'FILE';
  const cls =
    kind === 'pdf'
      ? 'bg-red-100 text-red-600'
      : kind === 'excel'
        ? 'bg-green-100 text-green-700'
        : 'bg-slate-200 text-slate-600';
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${cls}`}
    >
      {label}
    </span>
  );
}

function ViewerLoader() {
  return (
    <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-500">
      <span
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"
        aria-hidden
      />
      Cargando visor…
    </div>
  );
}

function CloseIcon() {
  return (
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
  );
}
