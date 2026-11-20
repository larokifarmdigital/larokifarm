'use client';

import { useId, useRef, useState } from 'react';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';

export const ACCEPT_CONCILIADOR = '.pdf,.xlsx,.xls,.xlsm';

interface DropzoneProps {
  onArchivos: (files: File[]) => void;
  /** Ya hay archivos cargados: se reduce a una línea "Añadir más archivos". */
  compacto?: boolean;
  disabled?: boolean;
}

/**
 * Zona de subida: se puede arrastrar (escritorio) o pulsar el botón. El
 * disparador es un <button> de verdad (antes era un div role=button sin
 * nombre accesible y la barra espaciadora hacía scroll).
 */
export function Dropzone({ onArchivos, compacto = false, disabled = false }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const ayudaId = useId();
  const [arrastrando, setArrastrando] = useState(false);

  function manejar(files: FileList | null) {
    if (disabled || !files || files.length === 0) return;
    onArchivos(Array.from(files));
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      multiple
      accept={ACCEPT_CONCILIADOR}
      className="sr-only"
      tabIndex={-1}
      aria-hidden
      onChange={(e) => {
        manejar(e.target.files);
        e.target.value = '';
      }}
    />
  );

  if (compacto) {
    return (
      <div>
        <button
          type="button"
          data-foco="anadir"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 min-h-11 px-4 rounded-[8px] border border-dashed border-[var(--color-hairline-strong)] text-[14.5px] font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <NavIcon name="Plus" size={16} />
          Añadir más archivos
        </button>
        {input}
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setArrastrando(true);
      }}
      onDragLeave={() => setArrastrando(false)}
      onDrop={(e) => {
        e.preventDefault();
        setArrastrando(false);
        manejar(e.dataTransfer.files);
      }}
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-[14px] border-2 border-dashed px-5 py-8 sm:py-12 text-center transition-colors',
        arrastrando
          ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
          : 'border-[var(--color-hairline-strong)] bg-[var(--color-surface)]',
      )}
    >
      <span
        aria-hidden
        className="hidden sm:flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
      >
        <NavIcon name="UploadSimple" size={26} />
      </span>
      <p className="hidden sm:block m-0 text-[17px] font-bold tracking-[-0.01em] text-[var(--color-ink)]">
        Arrastra aquí los archivos
      </p>
      <button
        type="button"
        data-foco="elegir"
        disabled={disabled}
        aria-describedby={ayudaId}
        onClick={() => inputRef.current?.click()}
        className="inline-flex w-full sm:w-auto items-center justify-center gap-2 min-h-11 px-6 rounded-[8px] bg-[var(--color-accent)] text-white text-[15px] font-semibold hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <NavIcon name="Plus" size={17} />
        Elegir archivos
      </button>
      <p id={ayudaId} className="m-0 max-w-md text-[14px] leading-[1.5] text-[var(--color-muted)]">
        El albarán o factura del proveedor (PDF) y tu pedido (Excel). Puedes subir
        varios envíos a la vez.
      </p>
      {input}
    </div>
  );
}
