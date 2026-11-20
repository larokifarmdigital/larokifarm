'use client';

import { usePathname } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useRef, type RefObject } from 'react';
import { signOut } from 'next-auth/react';
import { buildNav, ROL_LABEL } from '@/features/shell/ui/lib/navConfig';
import type { ShellInfo } from '@/features/shell/ui/lib/shellInfo';
import { NavList } from '@/features/shell/ui/components/NavList';
import { BrandMark } from '@/shared/components/atoms/BrandMark';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { supportMailto } from '@/shared/lib/support';

export function MobileNavDrawer({
  open,
  onClose,
  shell,
  devolverFocoA,
}: {
  open: boolean;
  onClose: () => void;
  shell: ShellInfo;
  /** El botón que abre el drawer no es un Dialog.Trigger: hay que devolverle el foco a mano. */
  devolverFocoA?: RefObject<HTMLButtonElement | null>;
}) {
  const items = buildNav({ role: shell.rol, miFarmaciaId: shell.miFarmacia?.id });
  const pathname = usePathname();
  const ayuda = supportMailto('Ayuda con el backoffice');

  // NOTE: cierra el drawer al navegar. `onClose` va en un ref porque el padre
  // pasa una arrow inline: como dep cerraría el drawer en el mismo tick.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    onCloseRef.current();
  }, [pathname]);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-[var(--color-ink)]/40 backdrop-blur-sm z-40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content
          onCloseAutoFocus={(e) => {
            if (!devolverFocoA?.current) return;
            e.preventDefault();
            devolverFocoA.current.focus();
          }}
          className="fixed left-0 top-0 bottom-0 z-50 w-[300px] max-w-[85vw] bg-[var(--color-surface-2)] border-r border-[var(--color-hairline)] flex flex-col data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left duration-200">
          <Dialog.Title className="sr-only">Menú</Dialog.Title>
          <div className="h-14 px-4 border-b border-[var(--color-hairline)] flex items-center justify-between">
            <BrandMark />
            <Dialog.Close
              aria-label="Cerrar menú"
              className="flex h-11 w-11 items-center justify-center rounded-[8px] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)]"
            >
              <NavIcon name="X" size={18} />
            </Dialog.Close>
          </div>

          <nav aria-label="Secciones" className="flex-1 overflow-y-auto px-3 py-4">
            <NavList items={items} pathname={pathname} variant="drawer" />
            {ayuda && (
              <a
                href={ayuda}
                className="mt-2 flex items-center gap-3 min-h-11 px-3 rounded-[8px] text-[15px] text-[var(--color-ink-2)] hover:bg-[var(--color-surface)]"
              >
                <NavIcon name="Question" size={18} className="text-[var(--color-muted)]" />
                Ayuda y soporte
              </a>
            )}
          </nav>

          <div className="border-t border-[var(--color-hairline)] px-4 py-3">
            <div className="text-[14px] font-medium text-[var(--color-ink)] truncate">{shell.nombre}</div>
            <div className="text-[12.5px] text-[var(--color-muted)] truncate">
              {ROL_LABEL[shell.rol]}
              {shell.miFarmacia ? ` · ${shell.miFarmacia.nombre}` : ''}
            </div>
            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: '/login' })}
              className="mt-3 w-full min-h-11 flex items-center justify-center gap-2 rounded-[8px] border border-[var(--color-hairline-strong)] text-[14px] font-medium text-[var(--color-red-ink)] hover:bg-[var(--color-red-soft)] transition-colors"
            >
              <NavIcon name="SignOut" size={16} />
              Cerrar sesión
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
