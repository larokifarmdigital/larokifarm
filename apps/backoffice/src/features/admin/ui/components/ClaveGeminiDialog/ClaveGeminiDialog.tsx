'use client';

import { useId, useState, useTransition } from 'react';
import { Modal, ModalAcciones } from '@/shared/components/molecules/Modal';
import { Label } from '@/shared/components/atoms/Label';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import type { UsoIaFarmacia } from '../../../data/usoData';
import { guardarClaveGeminiAction } from '../../../actions/iaActions';

/**
 * Poner o cambiar la clave propia de Gemini de una farmacia. Se comprueba con
 * Google antes de guardarla y después solo se enseñan sus 4 últimas letras.
 */
export function ClaveGeminiDialog({ farmacia, onClose }: { farmacia: UsoIaFarmacia; onClose: (final: string | null) => void }) {
  const id = useId();
  const [clave, setClave] = useState('');
  const [ver, setVer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();
  const cambiar = farmacia.finClave !== null;

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setErrorGeneral(null);
    startTransition(async () => {
      const res = await guardarClaveGeminiAction(farmacia.id, clave);
      if (res.ok) return onClose(res.data.final);
      if (res.fieldErrors?.clave) {
        setError(res.fieldErrors.clave);
        document.getElementById(`${id}-clave`)?.focus();
      } else setErrorGeneral(res.error);
    });
  }

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose(null)}
      title={cambiar ? `Cambiar la clave de ${farmacia.nombre}` : `Clave propia para ${farmacia.nombre}`}
      description="Con su propia clave, esta farmacia paga su uso de IA directamente a Google."
      footer={
        <ModalAcciones
          onCancelar={() => onClose(null)}
          textoPrincipal="Comprobar y guardar"
          textoEnviando="Comprobando con Google…"
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
        <ol className="m-0 flex list-decimal flex-col gap-1 pl-5 text-[14px] leading-[1.5] text-[var(--color-ink-2)]">
          <li>
            Entra en{' '}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-[var(--color-accent)] underline underline-offset-2"
            >
              Google AI Studio
              <NavIcon name="ArrowSquareOut" size={14} />
              <span className="sr-only">(se abre en otra pestaña)</span>
            </a>{' '}
            con la cuenta de Google de la farmacia.
          </li>
          <li>Pulsa «Crear clave de API» y cópiala.</li>
          <li>Pégala aquí debajo.</li>
        </ol>
        <div>
          <Label htmlFor={`${id}-clave`} required>
            Clave de Gemini
          </Label>
          <div className="relative">
            <input
              id={`${id}-clave`}
              type={ver ? 'text' : 'password'}
              className="field pr-12 font-mono-tabular"
              autoComplete="off"
              spellCheck={false}
              placeholder={cambiar ? `Ahora acaba en ${farmacia.finClave || '…'}` : 'AIza…'}
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              required
              aria-invalid={!!error}
              aria-describedby={[`${id}-ayuda`, error ? `${id}-error` : null].filter(Boolean).join(' ')}
            />
            <button
              type="button"
              onClick={() => setVer((v) => !v)}
              aria-label={ver ? 'Ocultar la clave' : 'Mostrar la clave'}
              aria-pressed={ver}
              className="absolute inset-y-0 right-1 my-auto flex h-10 w-10 items-center justify-center rounded-[6px] text-[var(--color-muted)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-ink)]"
            >
              <NavIcon name={ver ? 'EyeSlash' : 'Eye'} size={18} />
            </button>
          </div>
          <p id={`${id}-ayuda`} className="m-0 mt-1.5 text-[13px] leading-[1.5] text-[var(--color-muted)]">
            Se guarda cifrada y no se vuelve a enseñar: solo verás sus 4 últimas letras.
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
