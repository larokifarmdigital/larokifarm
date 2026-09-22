'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { NavIcon } from './NavIcon';

export function CommandStub({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-[var(--color-ink)]/25 backdrop-blur-sm z-40 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-[15vh] -translate-x-1/2 z-50 w-[92vw] max-w-[560px] bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[12px] shadow-[var(--shadow-elevated)] overflow-hidden data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <Dialog.Title className="sr-only">Búsqueda global</Dialog.Title>
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-hairline)]">
            <NavIcon name="MagnifyingGlass" size={16} className="text-[var(--color-muted)]" />
            <input
              type="text"
              placeholder="Busca farmacias, servicios, FAQs…"
              autoFocus
              className="flex-1 bg-transparent border-0 outline-none text-[15px] text-[var(--color-ink)] placeholder:text-[var(--color-muted-2)]"
            />
            <kbd>Esc</kbd>
          </div>
          <div className="p-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-[var(--color-surface-sunken)] flex items-center justify-center mb-3">
              <NavIcon
                name="MagnifyingGlassPlus"
                size={20}
                className="text-[var(--color-muted)]"
              />
            </div>
            <p className="text-[14px] text-[var(--color-muted)] leading-[1.6]">
              La búsqueda global estará disponible al conectar el backend.
            </p>
            <p className="mt-1 text-[12px] text-[var(--color-muted-2)]">
              Por ahora, usa el sidebar para navegar.
            </p>
          </div>
          <div className="px-4 py-2.5 border-t border-[var(--color-hairline)] flex items-center justify-between text-[11px] text-[var(--color-muted)]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <kbd>↵</kbd> abrir
              </span>
              <span className="flex items-center gap-1.5">
                <kbd>↑</kbd>
                <kbd>↓</kbd> navegar
              </span>
            </div>
            <span>WIP</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
