'use client';

import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  createBusinessAction,
  type BusinessActionState,
} from '../../../actions/businesses';

const initialState: BusinessActionState = {};

interface BusinessFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function BusinessForm({ onSuccess, onCancel }: BusinessFormProps) {
  const [state, formAction, pending] = useActionState(
    createBusinessAction,
    initialState,
  );
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (state.ok) {
      toast.success('Negocio creado');
      onSuccess?.();
    } else if (state.error) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name));
  }, [name, slugTouched]);

  return (
    <form action={formAction} className="space-y-4 text-sm">
      <FormField label="Nombre visible">
        <input
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="p.ej. Larokifarm"
          className={inputClass}
          style={inputStyle}
        />
      </FormField>

      <FormField
        label="Slug"
        hint="URL-safe: minúsculas, números y guiones"
      >
        <input
          name="slug"
          required
          pattern="[a-z0-9-]+"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugTouched(true);
          }}
          placeholder="p.ej. larokifarm"
          className={`${inputClass} font-mono`}
          style={inputStyle}
        />
        <p className="mt-1 text-[11px] text-slate-400">
          Aparece en URLs y en las rutas de storage. Se genera solo del nombre
          si no lo cambias.
        </p>
      </FormField>

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-70"
          style={{ background: 'var(--brand-primary)' }}
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
          {pending ? 'Creando…' : 'Crear negocio'}
        </button>
      </div>
    </form>
  );
}

function FormField({
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

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const inputClass =
  'block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

const inputStyle = {
  ['--tw-ring-color' as string]: 'var(--brand-primary-ring)',
} as React.CSSProperties;
