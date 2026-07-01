'use client';

import { useActionState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  createBusinessAction,
  type BusinessActionState,
} from '../../../actions/businesses';

const initialState: BusinessActionState = {};

interface BusinessFormProps {
  onSuccess?: () => void;
}

/** Form de creación de negocio. Edición se hace inline en la tabla. */
export function BusinessForm({ onSuccess }: BusinessFormProps) {
  const [state, formAction, pending] = useActionState(
    createBusinessAction,
    initialState,
  );

  useEffect(() => {
    if (state.ok) {
      toast.success('Negocio creado');
      onSuccess?.();
    } else if (state.error) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="space-y-4 text-sm">
      <label className="block">
        <span className="block text-xs font-medium uppercase tracking-wider text-gray-500">
          Slug (URL-safe)
        </span>
        <input
          name="slug"
          required
          pattern="[a-z0-9-]+"
          placeholder="p.ej. larokifarm"
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 font-mono"
        />
        <span className="mt-0.5 block text-xs text-gray-400">
          Solo minúsculas, números y guiones. Aparece en URLs y rutas de storage.
        </span>
      </label>

      <label className="block">
        <span className="block text-xs font-medium uppercase tracking-wider text-gray-500">
          Nombre visible
        </span>
        <input
          name="name"
          required
          placeholder="p.ej. Larokifarm"
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5"
        />
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
        {pending ? 'Creando…' : 'Crear negocio'}
      </button>
    </form>
  );
}
