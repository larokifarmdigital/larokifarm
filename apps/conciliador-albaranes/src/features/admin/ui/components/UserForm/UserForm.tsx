'use client';

import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { Role } from '@/core/shared';
import type { UserRow } from '@/core/users';
import type { BusinessRow } from '@/core/businesses';
import {
  createUserAction,
  updateUserAction,
  type UserActionState,
} from '../../../actions/users';
import { roleLabel } from '../../../lib/roleLabel';
import { generatePassword } from '../../../lib/generatePassword';

interface UserFormProps {
  /** Si se pasa, el form edita; si no, crea. */
  user?: UserRow;
  /** Roles asignables por el actor (lo decide el padre según rol del sesión). */
  rolesDisponibles: Role[];
  /** Negocios visibles (vacío = el actor no puede mover negocios). */
  negocios: BusinessRow[];
  /** Si true, el campo businessId queda oculto y se hereda del actor. */
  fijarBusiness?: boolean;
  /** Callback cuando la acción termina con éxito (para cerrar modal, refetch, etc). */
  onSuccess?: () => void;
}

const initialState: UserActionState = {};

export function UserForm({
  user,
  rolesDisponibles,
  negocios,
  fijarBusiness = false,
  onSuccess,
}: UserFormProps) {
  const isEdit = !!user;
  const action = isEdit ? updateUserAction : createUserAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (state.ok) {
      toast.success(isEdit ? 'Usuario actualizado' : 'Usuario creado');
      onSuccess?.();
    } else if (state.error) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function handleGeneratePassword() {
    const p = generatePassword(14);
    setPassword(p);
    setShowPassword(true);
  }

  async function handleCopyPassword() {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      toast.success('Contraseña copiada al portapapeles');
    } catch {
      toast.error('No se pudo copiar');
    }
  }

  return (
    <form action={formAction} className="space-y-4 text-sm">
      {isEdit && <input type="hidden" name="id" value={user.id} />}

      <Field label="Email">
        <input
          name="email"
          type="email"
          required
          disabled={isEdit}
          defaultValue={user?.email}
          title={isEdit ? 'El email no se puede modificar' : undefined}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
        />
        {isEdit && (
          <span className="mt-0.5 block text-xs text-gray-400">
            No editable
          </span>
        )}
      </Field>

      <Field label="Nombre">
        <input
          name="name"
          required
          defaultValue={user?.name}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5"
        />
      </Field>

      <Field
        label={isEdit ? 'Nueva contraseña (vacío = no cambiar)' : 'Contraseña'}
      >
        <div className="mt-1 flex gap-2">
          <div className="relative flex-1">
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              required={!isEdit}
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-gray-300 px-2 py-1.5 pr-16 font-mono"
              placeholder={isEdit ? 'Dejar vacío para no cambiar' : ''}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700"
              tabIndex={-1}
            >
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          <button
            type="button"
            onClick={handleGeneratePassword}
            className="rounded border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
          >
            Generar
          </button>
          {password && (
            <button
              type="button"
              onClick={handleCopyPassword}
              className="rounded border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              Copiar
            </button>
          )}
        </div>
        {!isEdit && password && (
          <span className="mt-1 block text-xs text-amber-600">
            Cópiala antes de crear el usuario — no se volverá a mostrar.
          </span>
        )}
      </Field>

      {rolesDisponibles.length > 1 ? (
        <Field label="Rol">
          <select
            name="role"
            defaultValue={user?.role ?? rolesDisponibles[0]}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5"
          >
            {rolesDisponibles.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <input type="hidden" name="role" value={rolesDisponibles[0]} />
      )}

      {!fijarBusiness && (
        <Field label="Negocio">
          <select
            name="businessId"
            defaultValue={user?.businessId ?? ''}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5"
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
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5"
          >
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </Field>
      )}

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
        {pending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear usuario'}
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
