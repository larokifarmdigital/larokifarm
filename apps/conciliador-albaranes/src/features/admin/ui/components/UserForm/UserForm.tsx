'use client';

import { useActionState } from 'react';
import type { BusinessRow, Role, UserRow } from '@/shared/core/domain';
import {
  createUserAction,
  updateUserAction,
  type UserActionState,
} from '../../../actions/users';

interface UserFormProps {
  /** Si se pasa, el form edita; si no, crea. */
  user?: UserRow;
  /** Roles asignables por el actor (lo decide el padre según rol del sesión). */
  rolesDisponibles: Role[];
  /** Negocios visibles (vacío = el actor no puede mover negocios). */
  negocios: BusinessRow[];
  /** Si true, el campo businessId queda oculto y se hereda del actor. */
  fijarBusiness?: boolean;
}

const initialState: UserActionState = {};

export function UserForm({
  user,
  rolesDisponibles,
  negocios,
  fijarBusiness = false,
}: UserFormProps) {
  const isEdit = !!user;
  const action = isEdit ? updateUserAction : createUserAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-3 text-sm">
      {isEdit && <input type="hidden" name="id" value={user.id} />}

      <Field label="Email">
        <input
          name="email"
          type="email"
          required
          disabled={isEdit}
          defaultValue={user?.email}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 disabled:bg-gray-100"
        />
      </Field>

      <Field label="Nombre">
        <input
          name="name"
          required
          defaultValue={user?.name}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
        />
      </Field>

      <Field
        label={isEdit ? 'Nueva contraseña (vacío = no cambiar)' : 'Contraseña'}
      >
        <input
          name="password"
          type="password"
          required={!isEdit}
          minLength={8}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
        />
      </Field>

      <Field label="Rol">
        <select
          name="role"
          defaultValue={user?.role ?? rolesDisponibles[0]}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
        >
          {rolesDisponibles.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </Field>

      {!fijarBusiness && (
        <Field label="Negocio">
          <select
            name="businessId"
            defaultValue={user?.businessId ?? ''}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
          >
            <option value="">— Sin negocio —</option>
            {negocios.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      {isEdit && (
        <Field label="Estado">
          <select
            name="active"
            defaultValue={String(user.active)}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
          >
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </Field>
      )}

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-red-700">{state.error}</p>
      )}
      {state.ok && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-green-700">
          Guardado.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
      >
        {pending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear usuario'}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wider text-gray-500">
        {label}
      </span>
      {children}
    </label>
  );
}
