'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { NavIcon } from '@/features/shell/NavIcon';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

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
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[var(--color-ink)]/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content
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
              className="shrink-0 flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-muted)] hover:text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] transition-colors"
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
