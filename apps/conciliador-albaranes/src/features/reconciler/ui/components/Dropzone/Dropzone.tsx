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
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
        arrastrando
          ? 'border-sky-500 bg-sky-50'
          : 'border-slate-300 bg-white hover:border-sky-400 hover:bg-slate-50'
      }`}
    >
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-sky-500" aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="M17 8l-5-5-5 5" />
        <path d="M12 3v12" />
      </svg>
      <p className="text-base font-semibold text-slate-700">
        Arrastra aquí los PDFs y Excels, o haz clic para elegirlos
      </p>
      <p className="text-sm text-slate-500">
        Se emparejan solos por nombre (ej. <code>DENTAID_albaran.pdf</code> ↔{' '}
        <code>DENTAID_pedido.xlsx</code>). Si un proveedor envía varios PDFs del mismo pedido
        (albarán + factura), ponles la misma clave para que se fusionen.
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
