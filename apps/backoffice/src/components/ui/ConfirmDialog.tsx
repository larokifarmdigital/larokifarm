'use client';

import { Modal } from './Modal';
import { Button } from './Button';
import type { ReactNode } from 'react';

/**
 * Confirmación destructiva reutilizable. Wrapper fino sobre `Modal`.
 *
 * Patrón: cualquier acción irreversible (eliminar FAQ, servicio, tarjeta, feature)
 * debe pasar por aquí. Nunca un `confirm()` nativo, nunca un botón que borra en el
 * acto. Regla de diseño: "Confirm before destruction".
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'accent';
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      maxWidth="sm"
      footer={
        <>
          <Button variant="ghost" size="md" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant}
            size="md"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {description && (
        <p className="text-[13.5px] leading-[1.55] text-[var(--color-ink-2)] m-0">
          {description}
        </p>
      )}
    </Modal>
  );
}
