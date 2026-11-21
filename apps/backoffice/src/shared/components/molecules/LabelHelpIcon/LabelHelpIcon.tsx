'use client';

import { useState, type ReactNode } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { NavIcon } from '@/shared/components/atoms/NavIcon';

/**
 * Icono ⓘ discreto para colocar dentro del `hint` de un `Label`.
 * Al hover/focus muestra un tooltip con la ayuda extendida — reemplaza al
 * `<p className="help">…</p>` que suele ir debajo del input y ocupar espacio
 * vertical fijo. En móvil (sin hover) se abre al tocarlo.
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
  const [abierto, setAbierto] = useState(false);
  return (
    <Tooltip.Root delayDuration={200} open={abierto} onOpenChange={setAbierto}>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          // Toque o clic: abre (Radix lo cierra en pointerdown; aquí se vuelve a abrir).
          onClick={(e) => {
            e.preventDefault();
            setAbierto(true);
          }}
          // Zona táctil de 44px en móvil y 24px en escritorio; márgenes negativos para no mover la etiqueta.
          className="inline-flex h-11 w-11 -my-3.5 -mx-3 sm:h-6 sm:w-6 sm:-my-1 sm:-mx-1 items-center justify-center rounded-full text-[var(--color-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
        >
          <NavIcon name="Info" size={13} />
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side={side}
          sideOffset={6}
          collisionPadding={8}
          className="z-50 max-w-[280px] bg-[var(--color-ink)] text-[var(--color-surface)] text-[12.5px] leading-[1.5] px-2.5 py-1.5 rounded-[6px] shadow-[var(--shadow-elevated)] data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0"
        >
          {children}
          <Tooltip.Arrow className="fill-[var(--color-ink)]" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
