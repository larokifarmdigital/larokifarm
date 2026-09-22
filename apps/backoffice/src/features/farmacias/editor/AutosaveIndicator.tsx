'use client';

import { useEffect, useState } from 'react';
import { useFarmaciaEditor } from './EditorContext';
import { formatRelativeDate } from '@/lib/utils';

export function AutosaveIndicator() {
  const { saveStatus, lastSavedAt, dirty } = useFarmaciaEditor();
  const [, forceTick] = useState(0);

  useEffect(() => {
    const i = setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => clearInterval(i);
  }, []);

  if (saveStatus === 'saving') {
    return (
      <span className="flex items-center gap-1.5 text-[12px] text-[var(--color-muted)]">
        <span
          aria-hidden
          className="inline-block h-2.5 w-2.5 rounded-full border-2 border-[var(--color-muted-2)] border-t-[var(--color-accent)] animate-spin"
        />
        Guardando…
      </span>
    );
  }

  if (dirty) {
    return (
      <span className="flex items-center gap-1.5 text-[12px] text-[var(--color-yellow-ink)]">
        <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-yellow-ink)]" />
        Cambios sin guardar
      </span>
    );
  }

  if (lastSavedAt) {
    return (
      <span className="flex items-center gap-1.5 text-[12px] text-[var(--color-muted)]">
        <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-green-ink)]" />
        Guardado {formatRelativeDate(lastSavedAt)}
      </span>
    );
  }

  return null;
}
