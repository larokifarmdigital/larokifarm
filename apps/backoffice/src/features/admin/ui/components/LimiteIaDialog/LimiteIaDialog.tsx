'use client';

import { useId, useState, useTransition } from 'react';
import { Modal, ModalAcciones } from '@/shared/components/molecules/Modal';
import { Label } from '@/shared/components/atoms/Label';
import type { UsoIaFarmacia } from '../../../data/usoData';
import { cambiarLimiteIaAction } from '../../../actions/iaActions';
import { dolares, limiteEnCampo } from '../../lib/dinero';

/** Cambiar el límite de gasto mensual de IA de una farmacia (vacío = sin límite). */
export function LimiteIaDialog({ farmacia, onClose }: { farmacia: UsoIaFarmacia; onClose: (guardado: boolean) => void }) {
  const id = useId();
  const [valor, setValor] = useState(limiteEnCampo(farmacia.limiteMes));
  const [error, setError] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setErrorGeneral(null);
    startTransition(async () => {
      const res = await cambiarLimiteIaAction(farmacia.id, valor);
      if (res.ok) return onClose(true);
      if (res.fieldErrors?.limite) {
        setError(res.fieldErrors.limite);
        document.getElementById(`${id}-limite`)?.focus();
      } else setErrorGeneral(res.error);
    });
  }

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose(false)}
      title={`Límite mensual de ${farmacia.nombre}`}
      description={`Este mes lleva gastado ${dolares(farmacia.gastoMes)}.`}
      maxWidth="sm"
      footer={
        <ModalAcciones
          onCancelar={() => onClose(false)}
          textoPrincipal="Guardar límite"
          textoEnviando="Guardando…"
          enviando={pendiente}
          form={`${id}-form`}
        />
      }
    >
      <form id={`${id}-form`} onSubmit={enviar} noValidate className="flex flex-col gap-4">
        {errorGeneral && (
          <p role="alert" className="m-0 rounded-[8px] bg-[var(--color-red-soft)] px-3 py-2 text-[13.5px] text-[var(--color-red-ink)]">
            {errorGeneral}
          </p>
        )}
        <div>
          <Label htmlFor={`${id}-limite`}>Límite al mes, en dólares</Label>
          <div className="relative max-w-[200px]">
            <input
              id={`${id}-limite`}
              className="field pr-9"
              inputMode="decimal"
              autoComplete="off"
              placeholder="Sin límite"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              aria-invalid={!!error}
              aria-describedby={[`${id}-ayuda`, error ? `${id}-error` : null].filter(Boolean).join(' ')}
            />
            <span aria-hidden className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--color-muted)]">
              $
            </span>
          </div>
          <p id={`${id}-ayuda`} className="m-0 mt-1.5 text-[13px] leading-[1.5] text-[var(--color-muted)]">
            Déjalo vacío para no poner límite. Al 80 % se avisa en la farmacia; al 100 % se para la IA hasta el mes siguiente.
          </p>
          {error && (
            <p id={`${id}-error`} className="m-0 mt-1.5 text-[13px] text-[var(--color-red-ink)]">
              {error}
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
}
