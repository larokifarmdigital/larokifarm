'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';
import { useRef, type ReactNode } from 'react';

export type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg';
};

const MAX_WIDTHS = {
  sm: 'max-w-[440px]',
  md: 'max-w-[560px]',
  lg: 'max-w-[720px]',
};

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  maxWidth = 'md',
}: ModalProps) {
  // Sin Dialog.Trigger, Radix no sabe a dónde devolver el foco al cerrar:
  // guardamos quién lo tenía al abrir y se lo devolvemos (si sigue en el DOM).
  const previo = useRef<HTMLElement | null>(null);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[var(--color-ink)]/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content
          onOpenAutoFocus={(e) => {
            let el = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            // Abierto desde un menú (⋯): el elemento del menú desaparece, así que
            // el foco vuelve al botón que abrió el menú (Radix lo enlaza con aria-labelledby).
            const menu = el?.closest('[role="menu"]');
            const disparador = menu?.getAttribute('aria-labelledby');
            if (disparador) el = document.getElementById(disparador) ?? el;
            previo.current = el;
            // En formularios, el foco empieza en el primer campo (no en "Cerrar").
            const campo = (e.currentTarget as HTMLElement | null)?.querySelector<HTMLElement>(
              'input:not([type=hidden]):not([type=file]):not([disabled]), textarea:not([disabled]), select:not([disabled])',
            );
            if (campo) {
              e.preventDefault();
              campo.focus();
            }
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            const el = previo.current;
            el?.focus();
            // Tras el render: si el disparador desapareció ("Añade tu primer…", el
            // Eliminar de la fila borrada), a la fila recién añadida o al título
            // de la sección; nunca a <body>.
            requestAnimationFrame(() => {
              if (el?.isConnected && document.activeElement === el) return;
              const destino =
                document.querySelector<HTMLElement>('[data-foco-tras-modal]') ??
                document.querySelector<HTMLElement>('[data-titulo-seccion]');
              destino?.focus();
            });
          }}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-24px)] max-h-[calc(100dvh-48px)] flex flex-col',
            'bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-lg)]',
            'shadow-[var(--shadow-elevated)] outline-none',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'duration-200',
            MAX_WIDTHS[maxWidth],
          )}
        >
          <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-[var(--color-hairline)]">
            <div className="min-w-0">
              <Dialog.Title className="text-[16px] font-semibold text-[var(--color-ink)] tracking-[-0.015em] m-0">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1 text-[12.5px] text-[var(--color-muted)] leading-[1.5]">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label="Cerrar"
              className="shrink-0 flex h-11 w-11 sm:h-7 sm:w-7 -mr-2 sm:mr-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-muted)] hover:text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] transition-colors"
            >
              <NavIcon name="X" size={14} />
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

          {footer && (
            <div className="shrink-0 flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--color-hairline)] bg-[var(--color-surface-2)]">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
