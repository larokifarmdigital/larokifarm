'use client';

import Link from 'next/link';
import { useFarmaciaEditor } from './EditorContext';
import { EditorHealthChip } from './EditorHealthChip';
import { EditorActionButtons } from './EditorActionButtons';
import { NavIcon } from '@/features/shell/NavIcon';

export function EditorTopBar() {
  const { farmacia } = useFarmaciaEditor();

  return (
    <div className="sticky top-14 z-20 bg-[var(--color-bg)]/90 backdrop-blur border-b border-[var(--color-hairline)]">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-3 flex items-center gap-2 sm:gap-3">
        <Link
          href="/farmacias"
          aria-label="Volver a farmacias"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-[var(--color-muted)] hover:text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] transition-colors"
        >
          <NavIcon name="CaretRight" size={14} className="rotate-180" />
        </Link>

        <div className="flex-1 min-w-0 flex items-center gap-2">
          <h1 className="text-[16px] sm:text-[18px] leading-tight tracking-[-0.02em] font-semibold text-[var(--color-ink)] truncate m-0">
            {farmacia.nombre}
          </h1>
          <div className="hidden sm:inline-flex">
            <EditorHealthChip />
          </div>
        </div>

        <div className="hidden sm:flex">
          <EditorActionButtons />
        </div>
      </div>
    </div>
  );
}
