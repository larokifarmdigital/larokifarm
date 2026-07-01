'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  changeOwnPasswordAction,
  type ChangePasswordState,
} from '../../../actions/password';

const initialState: ChangePasswordState = {};

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(
    changeOwnPasswordAction,
    initialState,
  );
  const [show, setShow] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success('Contraseña actualizada');
      formRef.current?.reset();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  const inputType = show ? 'text' : 'password';

  return (
    <form ref={formRef} action={formAction} className="space-y-4 text-sm">
      <Field label="Contraseña actual">
        <input
          name="currentPassword"
          type={inputType}
          required
          autoComplete="current-password"
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5"
        />
      </Field>

      <Field label="Nueva contraseña">
        <input
          name="newPassword"
          type={inputType}
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5"
        />
        <span className="mt-0.5 block text-xs text-gray-400">
          Mínimo 8 caracteres.
        </span>
      </Field>

      <Field label="Confirmar nueva contraseña">
        <input
          name="confirmPassword"
          type={inputType}
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5"
        />
      </Field>

      <label className="flex items-center gap-2 text-xs text-gray-600">
        <input
          type="checkbox"
          checked={show}
          onChange={(e) => setShow(e.target.checked)}
        />
        Mostrar contraseñas
      </label>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
      >
        {pending && (
          <span
            className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white"
            aria-hidden
          />
        )}
        {pending ? 'Guardando…' : 'Cambiar contraseña'}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium uppercase tracking-wider text-gray-500">
        {label}
      </span>
      {children}
    </label>
  );
}
