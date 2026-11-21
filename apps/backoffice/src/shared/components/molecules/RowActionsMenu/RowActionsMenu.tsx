'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { NavIcon, type IconName } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';

/**
 * Menú de acciones de una fila (UN solo punto de entrada en todas las listas):
 * botón "⋯" de 44 px en móvil y 32 px en escritorio. Orden: acción principal
 * (Editar) primero, destructivas al final tras `RowActionsSeparator`.
 */
export function RowActionsMenu({
  label,
  disabled,
  children,
  triggerProps,
}: {
  /** Nombre accesible del botón, p. ej. "Acciones para Farmacia Laguna". */
  label: string;
  disabled?: boolean;
  children: ReactNode;
  /** Atributos extra para el botón (p. ej. `data-acciones` para devolver el foco). */
  triggerProps?: Record<`data-${string}`, string>;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        {...triggerProps}
        aria-label={label}
        disabled={disabled}
        className="flex h-11 w-11 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-[8px] text-[var(--color-muted)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-ink)] data-[state=open]:bg-[var(--color-surface-sunken)] data-[state=open]:text-[var(--color-ink)] disabled:opacity-50"
      >
        <NavIcon name="DotsThree" size={20} weight="bold" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-[230px] max-w-[min(300px,calc(100vw-24px))] rounded-[10px] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-1.5 shadow-[var(--shadow-elevated)] outline-none"
        >
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

const ITEM =
  'flex items-center gap-2.5 min-h-11 sm:min-h-10 px-2.5 rounded-[6px] text-[14px] text-[var(--color-ink-2)] outline-none cursor-pointer data-[highlighted]:bg-[var(--color-surface-2)] data-[highlighted]:text-[var(--color-ink)] data-[disabled]:cursor-not-allowed data-[disabled]:text-[var(--color-muted)]';
const PELIGRO =
  'text-[var(--color-red-ink)] data-[highlighted]:bg-[var(--color-red-soft)] data-[highlighted]:text-[var(--color-red-ink)]';

export function RowActionsItem({
  icon,
  children,
  onSelect,
  href,
  externo,
  peligro,
  disabled,
  title,
  extra,
}: {
  icon: IconName;
  children: ReactNode;
  onSelect?: () => void;
  /** Enlace interno (Next Link) o externo si `externo`. */
  href?: string;
  externo?: boolean;
  peligro?: boolean;
  disabled?: boolean;
  title?: string;
  /** Texto pequeño a la derecha (p. ej. "Sin web"). */
  extra?: string;
}) {
  const contenido = (
    <>
      <NavIcon name={icon} size={15} className={peligro ? undefined : 'text-[var(--color-muted)]'} />
      <span className="min-w-0 flex-1">{children}</span>
      {extra && <span className="ml-2 shrink-0 text-[12.5px] text-[var(--color-muted)]">{extra}</span>}
    </>
  );
  const clase = cn(ITEM, peligro && PELIGRO);
  if (href && !disabled) {
    return (
      <DropdownMenu.Item asChild className={clase}>
        {externo ? (
          <a href={href} target="_blank" rel="noreferrer">
            {contenido}
          </a>
        ) : (
          <Link href={href}>{contenido}</Link>
        )}
      </DropdownMenu.Item>
    );
  }
  return (
    <DropdownMenu.Item className={clase} onSelect={onSelect} disabled={disabled} title={title}>
      {contenido}
    </DropdownMenu.Item>
  );
}

export function RowActionsSeparator() {
  return <DropdownMenu.Separator className="my-1 h-px bg-[var(--color-hairline)]" />;
}

/** Texto informativo dentro del menú (no es una acción). */
export function RowActionsNote({ children }: { children: ReactNode }) {
  return (
    <DropdownMenu.Label className="m-0 px-2.5 py-2 text-[13px] leading-[1.45] text-[var(--color-muted)]">
      {children}
    </DropdownMenu.Label>
  );
}
