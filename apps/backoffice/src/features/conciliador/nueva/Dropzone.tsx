'use client';

import { useRef, useState } from 'react';

type Props = {
  onFiles: (files: File[]) => void;
};

export function Dropzone({ onFiles }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handle(files: FileList | null) {
    if (!files || files.length === 0) return;
    onFiles(Array.from(files));
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handle(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      aria-label="Zona para arrastrar o elegir archivos"
      className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[12px] border-2 border-dashed px-6 py-14 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
        dragging
          ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
          : 'border-[var(--color-hairline-strong)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-sunken)] hover:border-[var(--color-accent-tint)]'
      }`}
    >
      <span
        aria-hidden
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="M17 8l-5-5-5 5" />
          <path d="M12 3v12" />
        </svg>
      </span>
      <p className="text-[15px] font-medium text-[var(--color-ink)] m-0">
        Arrastra los PDFs y Excels aquí, o haz clic para elegirlos
      </p>
      <p className="max-w-[560px] text-[13px] text-[var(--color-muted)] m-0 leading-[1.55]">
        Se emparejan solos por nombre (ej.{' '}
        <code className="font-mono-tabular rounded-[3px] bg-[var(--color-surface-sunken)] px-1.5 py-0.5 text-[11.5px] text-[var(--color-ink-2)]">
          DENTAID_albaran.pdf
        </code>{' '}
        ↔{' '}
        <code className="font-mono-tabular rounded-[3px] bg-[var(--color-surface-sunken)] px-1.5 py-0.5 text-[11.5px] text-[var(--color-ink-2)]">
          DENTAID_pedido.xlsx
        </code>
        ). Si un proveedor envía varios PDFs del mismo pedido (albarán + factura),
        ponles la misma clave y se fusionan.
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.xlsx,.xls,.xlsm"
        className="hidden"
        onChange={(e) => {
          handle(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
