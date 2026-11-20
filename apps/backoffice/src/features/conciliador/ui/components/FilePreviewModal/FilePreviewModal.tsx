'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import * as Dialog from '@radix-ui/react-dialog';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';

// NOTE: dynamic + ssr:false — xlsx (~300KB) y react-pdf (~1.5MB) fuera del bundle inicial y ambos dependen del DOM.
const PdfViewer = dynamic(() => import('../FilePreview/PdfViewer'), {
  ssr: false,
  loading: () => <CargandoVisor />,
});
const ExcelViewer = dynamic(() => import('../FilePreview/ExcelViewer'), {
  ssr: false,
  loading: () => <CargandoVisor />,
});

function CargandoVisor() {
  return (
    <div className="flex h-full items-center justify-center gap-2 text-sm text-[var(--color-muted)]">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" aria-hidden />
      Cargando visor…
    </div>
  );
}

export interface PreviewFile {
  name: string;
  /** Archivo recién subido (File) o guardado en el historial (URL /api/files/…). */
  src: File | string;
  kind: 'pdf' | 'excel';
}

const FICHA_TIPO = (kind: PreviewFile['kind']) =>
  cn('shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold', kind === 'pdf' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-800');

const BTN =
  'inline-flex items-center justify-center gap-1.5 min-h-11 px-3 rounded-[8px] border border-[var(--color-hairline-strong)] bg-[var(--color-surface)] text-[14px] font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-2)]';

/**
 * Visor de los archivos de una conciliación (los mismos en "Nueva conciliación"
 * y en el historial). Radix Dialog: atrapa el foco y deja el fondo inerte; al
 * cerrar devolvemos el foco a mano al botón que lo abrió (no hay Trigger).
 */
export function FilePreviewModal({
  files,
  initialIdx = 0,
  onClose,
  devolverFocoA,
}: {
  files: PreviewFile[];
  initialIdx?: number;
  onClose: () => void;
  devolverFocoA: React.RefObject<HTMLElement | null>;
}) {
  const [selectedIdx, setSelectedIdx] = useState(initialIdx);
  const selected = files[selectedIdx];

  function conUrl(accion: (url: string) => void) {
    if (!selected) return;
    if (typeof selected.src === 'string') return accion(selected.src);
    const url = URL.createObjectURL(selected.src);
    accion(url);
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  function descargarActual() {
    conUrl((url) => {
      const a = document.createElement('a');
      a.href = url;
      a.download = selected!.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  }

  function abrirEnPestana() {
    conUrl((url) => window.open(url, '_blank', 'noopener,noreferrer'));
  }

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            devolverFocoA.current?.focus();
          }}
          className="fixed inset-2 sm:inset-6 z-50 mx-auto flex max-w-5xl flex-col overflow-hidden rounded-[14px] bg-[var(--color-surface)] shadow-2xl outline-none"
        >
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-hairline)] px-3 sm:px-4 py-2">
            <Dialog.Title className="m-0 flex-1 min-w-0 truncate text-[15px] font-semibold text-[var(--color-ink)]">
              {selected?.name}
            </Dialog.Title>
            {selected?.kind === 'pdf' && (
              <button type="button" onClick={abrirEnPestana} className={BTN}>
                Abrir en pestaña
              </button>
            )}
            <button type="button" onClick={descargarActual} className={BTN}>
              <NavIcon name="DownloadSimple" size={16} />
              Descargar
            </button>
            <Dialog.Close
              aria-label="Cerrar"
              className="flex h-11 w-11 items-center justify-center rounded-[8px] text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
            >
              <NavIcon name="X" size={18} />
            </Dialog.Close>
          </div>

          {files.length > 1 && (
            <nav aria-label="Archivos" className="shrink-0 border-b border-[var(--color-hairline)] bg-[var(--color-surface-2)] px-2 py-2">
              <ul className="flex gap-1.5 overflow-x-auto">
                {files.map((f, i) => (
                  <li key={i} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedIdx(i)}
                      aria-current={i === selectedIdx ? 'true' : undefined}
                      className={cn(
                        'inline-flex items-center gap-1.5 min-h-11 px-3 rounded-[8px] text-[13.5px]',
                        i === selectedIdx
                          ? 'bg-[var(--color-surface)] text-[var(--color-ink)] shadow-sm font-medium'
                          : 'text-[var(--color-ink-2)] hover:bg-[var(--color-surface)]',
                      )}
                    >
                      <span className={FICHA_TIPO(f.kind)}>{f.kind === 'pdf' ? 'PDF' : 'XLS'}</span>
                      <span className="max-w-[180px] truncate">{f.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <div className="flex-1 overflow-hidden bg-slate-100">
            {selected?.kind === 'pdf' ? (
              <PdfViewer key={`${selectedIdx}-${selected.name}`} file={selected.src} />
            ) : selected?.kind === 'excel' ? (
              <ExcelViewer key={`${selectedIdx}-${selected.name}`} file={selected.src} />
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
