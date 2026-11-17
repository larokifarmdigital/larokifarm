'use client';

import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// NOTE: worker de PDF.js desde unpkg — evita configurar Webpack en Next.
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  /** Blob local (subida) o URL remota (historial en R2). */
  file: File | string;
}

export default function PdfViewer({ file }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setContainerWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function onLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
    setError(null);
  }

  function onLoadError(e: Error) {
    setError(e.message || 'No se pudo cargar el PDF.');
  }

  function goto(delta: number) {
    setPageNumber((p) => Math.max(1, Math.min(numPages, p + delta)));
  }

  function jumpTo(v: number) {
    if (Number.isNaN(v)) return;
    setPageNumber(Math.max(1, Math.min(numPages, v)));
  }

  function zoom(delta: number) {
    setScale((s) => clamp(s + delta, 0.5, 3));
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-100">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <div className="flex items-center gap-1">
          <ToolbarButton
            onClick={() => goto(-1)}
            disabled={pageNumber <= 1}
            title="Página anterior"
          >
            <ChevronLeftIcon />
          </ToolbarButton>
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <input
              type="number"
              min={1}
              max={numPages || 1}
              value={pageNumber}
              onChange={(e) => jumpTo(Number(e.target.value))}
              className="w-14 rounded-md border border-slate-300 px-2 py-1 text-center text-xs"
            />
            <span>de {numPages || '—'}</span>
          </div>
          <ToolbarButton
            onClick={() => goto(+1)}
            disabled={pageNumber >= numPages}
            title="Página siguiente"
          >
            <ChevronRightIcon />
          </ToolbarButton>
        </div>

        <div className="flex items-center gap-1">
          <ToolbarButton
            onClick={() => zoom(-0.2)}
            disabled={scale <= 0.5}
            title="Reducir zoom"
          >
            <MinusIcon />
          </ToolbarButton>
          <span className="w-12 text-center text-xs tabular-nums text-slate-600">
            {Math.round(scale * 100)}%
          </span>
          <ToolbarButton
            onClick={() => zoom(+0.2)}
            disabled={scale >= 3}
            title="Aumentar zoom"
          >
            <PlusIcon />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => setScale(1)}
            disabled={scale === 1}
            title="Ajustar al ancho"
          >
            <FitIcon />
          </ToolbarButton>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-auto"
      >
        {error ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-red-700">
            {error}
          </div>
        ) : (
          <div className="flex justify-center p-4">
            <Document
              file={file}
              onLoadSuccess={onLoadSuccess}
              onLoadError={onLoadError}
              loading={<Loader label="Cargando PDF…" />}
              error={
                <div className="text-sm text-red-700">
                  No se pudo cargar el PDF.
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                width={
                  containerWidth
                    ? Math.min(containerWidth - 40, 1200) * scale
                    : undefined
                }
                renderTextLayer
                renderAnnotationLayer
                className="shadow-lg"
                loading={<Loader label="Cargando página…" />}
              />
            </Document>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className="flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function Loader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500">
      <span
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"
        aria-hidden
      />
      {label}
    </div>
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

function ChevronLeftIcon() {
  return (
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
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
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
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function PlusIcon() {
  return (
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
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function MinusIcon() {
  return (
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
      <path d="M5 12h14" />
    </svg>
  );
}

function FitIcon() {
  return (
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
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  );
}
