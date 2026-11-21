'use client';

import { useId, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Modal, ModalAcciones } from '@/shared/components/molecules/Modal';
import { Label } from '@/shared/components/atoms/Label';
import { cambiarMiContrasenaAction } from '@/features/auth/actions/passwordActions';

const MIN = 10;

/** "Cambiar mi contraseña": para cualquier rol, sobre su propia cuenta. */
export function CambiarContrasenaDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const id = useId();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  function cerrar(o: boolean) {
    if (!o) {
      setActual('');
      setNueva('');
      setRepetir('');
      setErrores({});
      setErrorGeneral(null);
    }
    onOpenChange(o);
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErrorGeneral(null);
    startTransition(async () => {
      const res = await cambiarMiContrasenaAction({ actual, nueva, repetir });
      if (res.ok) {
        toast.success('Contraseña cambiada', {
          description: res.data.reentrar
            ? 'Vuelve a entrar con la nueva contraseña en unos minutos.'
            : 'La próxima vez entra con la nueva. Se cerrará la sesión en tus otros dispositivos.',
        });
        cerrar(false);
        return;
      }
      const fe = res.fieldErrors ?? {};
      setErrores(fe);
      setErrorGeneral(Object.keys(fe).length ? null : res.error);
      const primero = Object.keys(fe)[0];
      if (primero) requestAnimationFrame(() => document.getElementById(`${id}-${primero}`)?.focus());
    });
  }

  const campo = (k: 'actual' | 'nueva' | 'repetir', etiqueta: string, valor: string, set: (v: string) => void, ayuda?: string) => (
    <div>
      <Label htmlFor={`${id}-${k}`} required>
        {etiqueta}
      </Label>
      <input
        id={`${id}-${k}`}
        type="password"
        className="field"
        value={valor}
        onChange={(e) => set(e.target.value)}
        autoComplete={k === 'actual' ? 'current-password' : 'new-password'}
        required
        aria-invalid={!!errores[k]}
        aria-describedby={[ayuda ? `${id}-${k}-ayuda` : null, errores[k] ? `${id}-${k}-error` : null].filter(Boolean).join(' ') || undefined}
      />
      {ayuda && (
        <p id={`${id}-${k}-ayuda`} className="m-0 mt-1.5 text-[13px] text-[var(--color-muted)]">
          {ayuda}
        </p>
      )}
      {errores[k] && (
        <p id={`${id}-${k}-error`} className="m-0 mt-1.5 text-[13px] text-[var(--color-red-ink)]">
          {errores[k]}
        </p>
      )}
    </div>
  );

  return (
    <Modal
      open={open}
      onOpenChange={cerrar}
      title="Cambiar mi contraseña"
      maxWidth="sm"
      footer={
        <ModalAcciones
          onCancelar={() => cerrar(false)}
          textoPrincipal="Cambiar contraseña"
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
        {campo('actual', 'Contraseña actual', actual, setActual)}
        {campo('nueva', 'Nueva contraseña', nueva, setNueva, `Al menos ${MIN} caracteres. Una frase corta es fácil de recordar.`)}
        {campo('repetir', 'Repite la nueva contraseña', repetir, setRepetir)}
      </form>
    </Modal>
  );
}
