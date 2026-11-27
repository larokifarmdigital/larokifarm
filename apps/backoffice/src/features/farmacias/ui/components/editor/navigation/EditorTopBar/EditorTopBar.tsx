'use client';

import Link from 'next/link';
import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { EditorHealthChip } from '@/features/farmacias/ui/components/editor/status/EditorHealthChip';
import { EditorActionButtons } from '@/features/farmacias/ui/components/editor/navigation/EditorActionButtons';
import { AutosaveIndicator } from '@/features/farmacias/ui/components/editor/status/AutosaveIndicator';
import { PublicacionEstado } from '@/features/farmacias/ui/components/editor/status/PublicacionEstado';
import { NavIcon } from '@/shared/components/atoms/NavIcon';

export function EditorTopBar({ volverA }: { volverA: string }) {
  const { farmacia } = useFarmaciaEditor();

  return (
    // En móvil la barra de la app no es fija dentro del editor: esta se pega arriba del todo.
    <div className="sticky top-0 lg:top-14 z-20 bg-[var(--color-bg)]/92 backdrop-blur border-b border-[var(--color-hairline)]">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-2.5 flex items-center gap-2 sm:gap-3">
        <Link
          href={volverA}
          aria-label={volverA === '/inicio' ? 'Volver al inicio' : 'Volver a farmacias'}
          className="flex h-11 w-11 lg:h-9 lg:w-9 shrink-0 items-center justify-center rounded-[6px] text-[var(--color-muted)] hover:text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] transition-colors"
        >
          <NavIcon name="CaretRight" size={14} className="rotate-180" />
        </Link>

        <div className="flex-1 min-w-0">
          <h1 className="text-[16px] sm:text-[18px] leading-tight tracking-[-0.02em] font-bold text-[var(--color-ink)] truncate m-0">
            {farmacia.nombre}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0">
            <AutosaveIndicator />
            <span className="hidden sm:inline-flex">
              <PublicacionEstado />
            </span>
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
