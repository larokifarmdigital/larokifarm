'use client';

import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { Role } from '@/core/shared';
import type { UserRow } from '@/core/users';
import type { BusinessRow } from '@/core/businesses';
import { Select } from '@/shared/components/molecules/Select';
import {
  createUserAction,
  updateUserAction,
  type UserActionState,
} from '../../../actions/users';
import { roleLabel } from '../../../lib/roleLabel';
import { generatePassword } from '../../../lib/generatePassword';

interface UserFormProps {
  user?: UserRow;
  rolesDisponibles: Role[];
  negocios: BusinessRow[];
  fijarBusiness?: boolean;
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
  const [role, setRole] = useState<Role>(user?.role ?? rolesDisponibles[0]);
  const [businessId, setBusinessId] = useState<string>(user?.businessId ?? '');
  const [active, setActive] = useState<string>(String(user?.active ?? true));

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

  const roleOptions = rolesDisponibles.map((r) => ({
    value: r,
    label: roleLabel(r),
  }));

  const businessOptions = [
    { value: '', label: '— Sin negocio —' },
    ...negocios.map((b) => ({ value: b.id, label: b.name })),
  ];

  return (
    <form action={formAction} className="space-y-4 text-sm">
      {isEdit && <input type="hidden" name="id" value={user.id} />}
      {rolesDisponibles.length === 1 && (
        <input type="hidden" name="role" value={rolesDisponibles[0]} />
      )}

      <Field label="Email" hint={isEdit ? 'No editable' : undefined}>
        <input
          name="email"
          type="email"
          required
          disabled={isEdit}
          defaultValue={user?.email}
          className={inputClass}
          style={inputStyle}
        />
      </Field>

      <Field label="Nombre">
        <input
          name="name"
          required
          defaultValue={user?.name}
          placeholder="Nombre completo"
          className={inputClass}
          style={inputStyle}
        />
      </Field>

      <Field
        label={isEdit ? 'Nueva contraseña' : 'Contraseña'}
        hint={isEdit ? 'Dejar vacío para no cambiar' : undefined}
      >
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              required={!isEdit}
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEdit ? '••••••••' : 'Mínimo 8 caracteres'}
              className={`${inputClass} pr-10 font-mono`}
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              tabIndex={-1}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          <button
            type="button"
            onClick={handleGeneratePassword}
            title="Generar contraseña"
            className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <DiceIcon />
            Generar
          </button>
          {password && (
            <button
              type="button"
              onClick={handleCopyPassword}
              title="Copiar contraseña"
              className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              aria-label="Copiar contraseña"
            >
              <CopyIcon />
            </button>
          )}
        </div>
        {!isEdit && password && (
          <span className="mt-1.5 flex items-center gap-1 text-xs text-amber-700">
            <WarningIcon />
            Copia la contraseña antes de crear el usuario.
          </span>
        )}
      </Field>

      {rolesDisponibles.length > 1 && (
        <Field label="Rol">
          <input type="hidden" name="role" value={role} />
          <Select
            value={role}
            onChange={(v) => setRole(v as Role)}
            options={roleOptions}
          />
        </Field>
      )}

      {!fijarBusiness && (
        <Field label="Negocio">
          <input type="hidden" name="businessId" value={businessId} />
          <Select
            value={businessId}
            onChange={setBusinessId}
            options={businessOptions}
            searchable={businessOptions.length > 6}
          />
        </Field>
      )}

      {isEdit && (
        <Field label="Estado">
          <input type="hidden" name="active" value={active} />
          <Select
            value={active}
            onChange={setActive}
            options={[
              { value: 'true', label: 'Activo' },
              { value: 'false', label: 'Inactivo' },
            ]}
          />
        </Field>
      )}

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        {onSuccess && (
          <button
            type="button"
            onClick={onSuccess}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-70"
          style={{
            background: 'var(--brand-primary)',
          }}
          onMouseEnter={(e) => {
            if (!pending)
              (e.currentTarget as HTMLButtonElement).style.background =
                'var(--brand-primary-hover)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              'var(--brand-primary)';
          }}
        >
          {pending && (
            <span
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              aria-hidden
            />
          )}
          {pending
            ? 'Guardando…'
            : isEdit
              ? 'Guardar cambios'
              : 'Crear usuario'}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {label}
        </label>
        {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

const inputClass =
  'block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

const inputStyle = {
  ['--tw-ring-color' as string]: 'var(--brand-primary-ring)',
} as React.CSSProperties;

/* --------------------------------- Icons ---------------------------------- */

function EyeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

function DiceIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M8 8h.01M16 8h.01M16 16h.01M8 16h.01M12 12h.01" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m10.29 3.86-8.4 14.5A2 2 0 0 0 3.62 21h16.76a2 2 0 0 0 1.73-2.64l-8.4-14.5a2 2 0 0 0-3.46 0Z" />
      <line x1="12" x2="12" y1="9" y2="13" />
      <line x1="12" x2="12.01" y1="17" y2="17" />
    </svg>
  );
}
