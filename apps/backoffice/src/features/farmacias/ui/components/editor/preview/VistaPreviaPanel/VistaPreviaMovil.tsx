'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { VistaPreviaPanel } from './VistaPreviaPanel';

/** Por debajo de lg no hay sitio para dos columnas: la vista previa ocupa la pantalla. */
export function VistaPreviaMovil({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content
          aria-describedby={undefined}
          // Sin Dialog.Trigger: el foco lo devuelve `cerrar` al botón del ojo.
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="fixed inset-0 z-50 flex flex-col bg-[var(--color-bg)] p-2 pb-[max(env(safe-area-inset-bottom),8px)] focus:outline-none"
        >
          <Dialog.Title className="sr-only">Vista previa de tu web</Dialog.Title>
          <VistaPreviaPanel vistaInicial="movil" onCerrar={() => onOpenChange(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
