'use client';

import type { ReactNode } from 'react';
import { NavIcon } from '@/shared/components/atoms/NavIcon';

/**
 * "Textos de la cabecera" de una sección (etiqueta, título, subtítulo): se
 * tocan casi nunca, así que van plegados DESPUÉS de la lista. Se abre solo si
 * falta algo obligatorio.
 */
export function CabeceraColapsable({
  resumen,
  abierta = false,
  children,
}: {
  /** Una línea con lo que hay ahora ("Nuestros servicios · Recursos de confianza"). */
  resumen: string;
  abierta?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="group card p-0 overflow-hidden" open={abierta || undefined}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-[var(--color-surface-2)] focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:-outline-offset-2 [&::-webkit-details-marker]:hidden">
        <span className="flex-1 min-w-0">
          <span className="block text-[14px] font-semibold text-[var(--color-ink)]">Textos de la cabecera de la sección</span>
          <span className="block truncate text-[13px] text-[var(--color-muted)]">{resumen || 'Sin rellenar'}</span>
        </span>
        <NavIcon name="CaretDown" size={14} className="shrink-0 text-[var(--color-muted)] transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-[var(--color-hairline)] p-4 sm:p-5">{children}</div>
    </details>
  );
}
