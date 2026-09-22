'use client';

import type { ReactNode } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { NavIcon } from '@/features/shell/NavIcon';

/**
 * Icono ⓘ discreto para colocar dentro del `hint` de un `Label`.
 * Al hover/focus muestra un tooltip con la ayuda extendida — reemplaza al
 * `<p className="help">…</p>` que suele ir debajo del input y ocupar espacio
 * vertical fijo.
 */
export function LabelHelpIcon({
  children,
  ariaLabel = 'Más información',
  side = 'top',
}: {
  children: ReactNode;
  ariaLabel?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
}) {
  return (
    <Tooltip.Root delayDuration={200}>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[var(--color-muted-2)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
        >
          <NavIcon name="Info" size={11} />
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side={side}
          sideOffset={6}
          collisionPadding={8}
          className="z-50 max-w-[280px] bg-[var(--color-ink)] text-[var(--color-surface)] text-[11.5px] leading-[1.5] px-2.5 py-1.5 rounded-[6px] shadow-[var(--shadow-elevated)] data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0"
        >
          {children}
          <Tooltip.Arrow className="fill-[var(--color-ink)]" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
