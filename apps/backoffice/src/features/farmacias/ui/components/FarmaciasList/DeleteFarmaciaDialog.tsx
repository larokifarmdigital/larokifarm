'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/atoms/Button';
import { Input } from '@/shared/components/atoms/Input';
import { Modal } from '@/shared/components/molecules/Modal';

/**
 * Borrado definitivo: hay que escribir el nombre exacto para confirmar
 * ("confirm before destruction", y aquí no hay deshacer).
 */
export function DeleteFarmaciaDialog({
  open,
  onOpenChange,
  nombre,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nombre: string;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = useState('');
  const matches = typed.trim() === nombre.trim();
  const close = (o: boolean) => {
    if (!o) setTyped('');
    onOpenChange(o);
  };

  return (
    <Modal
      open={open}
      onOpenChange={close}
      title={`¿Eliminar «${nombre}» definitivamente?`}
      description="Se borrarán su contenido, sus reseñas y sus imágenes. No se puede deshacer."
      maxWidth="sm"
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" size="md" onClick={() => close(false)} className="w-full justify-center sm:w-auto">
            Cancelar
          </Button>
          <Button
            variant="danger"
            size="md"
            disabled={!matches}
            onClick={() => {
              setTyped('');
              onConfirm();
            }}
            className="w-full justify-center sm:w-auto"
          >
            Eliminar definitivamente
          </Button>
        </div>
      }
    >
      <label htmlFor="confirmar-nombre" className="block text-[13px] text-[var(--color-ink-2)] mb-2">
        Escribe <strong className="font-semibold text-[var(--color-ink)]">{nombre}</strong> para confirmar:
      </label>
      <Input
        id="confirmar-nombre"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        autoComplete="off"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter' && matches) {
            setTyped('');
            onConfirm();
          }
        }}
      />
    </Modal>
  );
}
