'use client';

import { useRef, useState } from 'react';

interface DropzoneProps {
  onArchivos: (files: File[]) => void;
}

export function Dropzone({ onArchivos }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arrastrando, setArrastrando] = useState(false);

  function manejar(files: FileList | null) {
    if (!files || files.length === 0) return;
    onArchivos(Array.from(files));
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setArrastrando(true);
      }}
      onDragLeave={() => setArrastrando(false)}
      onDrop={(e) => {
        e.preventDefault();
        setArrastrando(false);
        manejar(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
      }}
      className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
        arrastrando ? '' : 'border-slate-300 bg-white hover:bg-slate-50'
      }`}
      style={
        arrastrando
          ? {
              borderColor: 'var(--brand-primary)',
              background: 'var(--brand-primary-soft)',
            }
          : undefined
      }
      onMouseEnter={(e) => {
        if (arrastrando) return;
        (e.currentTarget as HTMLDivElement).style.borderColor =
          'var(--brand-primary-ring)';
      }}
      onMouseLeave={(e) => {
        if (arrastrando) return;
        (e.currentTarget as HTMLDivElement).style.borderColor = '';
      }}
    >
      <span
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{
          background: 'var(--brand-primary-soft)',
          color: 'var(--brand-primary)',
        }}
        aria-hidden
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
      <p className="text-base font-semibold text-slate-800">
        Arrastra aquí los PDFs y Excels, o haz clic para elegirlos
      </p>
      <p className="max-w-2xl text-sm text-slate-500">
        Se emparejan solos por nombre (ej.{' '}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
          DENTAID_albaran.pdf
        </code>{' '}
        ↔{' '}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
          DENTAID_pedido.xlsx
        </code>
        ). Si un proveedor envía varios PDFs del mismo pedido (albarán + factura),
        ponles la misma clave para que se fusionen.
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.xlsx,.xls,.xlsm"
        className="hidden"
        onChange={(e) => {
          manejar(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
