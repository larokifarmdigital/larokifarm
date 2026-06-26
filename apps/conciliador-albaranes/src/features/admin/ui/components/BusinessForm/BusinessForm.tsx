'use client';

import { useActionState } from 'react';
import {
  createBusinessAction,
  type BusinessActionState,
} from '../../../actions/businesses';

const initialState: BusinessActionState = {};

/** Form de creación. La edición de nombre se hace inline en la tabla. */
export function BusinessForm() {
  const [state, formAction, pending] = useActionState(
    createBusinessAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3 text-sm">
      <label className="block">
        <span className="block text-xs uppercase tracking-wider text-gray-500">
          Slug (URL-safe, ej. "torrents")
        </span>
        <input
          name="slug"
          required
          pattern="[a-z0-9-]+"
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
        />
      </label>

      <label className="block">
        <span className="block text-xs uppercase tracking-wider text-gray-500">
          Nombre visible
        </span>
        <input
          name="name"
          required
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
        />
      </label>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-red-700">{state.error}</p>
      )}
      {state.ok && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-green-700">
          Negocio creado.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
      >
        {pending ? 'Creando…' : 'Crear negocio'}
      </button>
    </form>
  );
}
