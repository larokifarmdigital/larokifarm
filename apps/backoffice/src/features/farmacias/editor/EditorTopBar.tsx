'use client';

import Link from 'next/link';
import { useFarmaciaEditor } from './EditorContext';
import { EditorHealthChip } from './EditorHealthChip';
import { EditorActionButtons } from './EditorActionButtons';
import { AutosaveIndicator } from './AutosaveIndicator';
import { NavIcon } from '@/features/shell/NavIcon';

export function EditorTopBar() {
  const { farmacia } = useFarmaciaEditor();

  return (
    <div className="sticky top-14 z-20 bg-[var(--color-bg)]/92 backdrop-blur border-b border-[var(--color-hairline)]">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-3 flex items-center gap-2 sm:gap-3">
        <Link
          href="/farmacias"
          aria-label="Volver a farmacias"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-[var(--color-muted)] hover:text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] transition-colors"
        >
          <NavIcon name="CaretRight" size={14} className="rotate-180" />
        </Link>

        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-0.5">
          <h1 className="text-[16px] sm:text-[18px] leading-tight tracking-[-0.02em] font-bold text-[var(--color-ink)] truncate m-0">
            {farmacia.nombre}
          </h1>
          {/* Autosave status visible al lado del nombre — Fase A #6: confianza */}
          <div className="hidden sm:flex items-center gap-2">
            <AutosaveIndicator />
            <span aria-hidden className="h-3 w-px bg-[var(--color-hairline)]" />
            <EditorHealthChip />
          </div>
          {/* En móvil el autosave va debajo del nombre, el health chip se oculta */}
          <div className="sm:hidden">
            <AutosaveIndicator />
          </div>
        </div>

        <div className="hidden sm:flex">
          <EditorActionButtons />
        </div>
      </div>
    </div>
  );
}
