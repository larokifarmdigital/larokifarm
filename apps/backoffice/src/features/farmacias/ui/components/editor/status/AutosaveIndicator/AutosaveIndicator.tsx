'use client';

import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { formatRelativeDate } from '@/shared/lib/format';

/** Eje 1 del estado: ¿está guardado? (el eje 2, ¿está en la web?, es PublicacionEstado). */
export function AutosaveIndicator() {
  const { saveStatus, errorKind, lastSavedAt, dirty, saveNow, readOnly } = useFarmaciaEditor();
  if (readOnly) return null;

  if (saveStatus === 'saving') {
    return (
      <span className="flex items-center gap-1.5 text-[13px] text-[var(--color-muted)]">
        <span
          aria-hidden
          className="inline-block h-2.5 w-2.5 rounded-full border-2 border-[var(--color-muted-2)] border-t-[var(--color-accent)] animate-spin"
        />
        Guardando…
      </span>
    );
  }

  if (saveStatus === 'conflict') {
    return (
      <span className="flex items-center gap-1.5 text-[13px] text-[var(--color-red-ink)]">
        <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-red-ink)]" />
        No se ha podido guardar · recarga la página
      </span>
    );
  }

  if (saveStatus === 'error' && dirty) {
    return (
      <span className="flex items-center gap-1.5 text-[13px] text-[var(--color-red-ink)]">
        <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-red-ink)]" />
        {errorKind === 'network' ? 'Sin conexión: no se ha podido guardar ·' : 'No se ha podido guardar ·'}
        <button
          type="button"
          onClick={() => void saveNow()}
          className="min-h-11 sm:min-h-0 font-semibold underline underline-offset-2"
        >
          Reintentar
        </button>
      </span>
    );
  }

  if (dirty) {
    return <span className="text-[13px] text-[var(--color-muted)]">Guardando en unos segundos…</span>;
  }

  if (lastSavedAt) {
    return (
      <span className="flex items-center gap-1.5 text-[13px] text-[var(--color-muted)]" title={`Guardado ${formatRelativeDate(lastSavedAt)}`}>
        <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-green-ink)]" />
        Guardado
      </span>
    );
  }

  return null;
}
