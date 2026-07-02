'use client';

import { useActionState, useEffect, useState } from 'react';
import { loginAction, type LoginState } from '../../../actions/login';

const initialState: LoginState = {};

const REMEMBERED_EMAIL_KEY = 'conciliador.rememberedEmail';

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [remember, setRemember] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(REMEMBERED_EMAIL_KEY);
      if (saved) {
        setEmail(saved);
        setRemember(true);
      }
    } catch {
      /* localStorage puede fallar en modo incógnito estricto */
    }
    setHydrated(true);
  }, []);

  function handleSubmit(formData: FormData) {
    // NOTE: persistimos antes de la server action; si falla localStorage seguimos.
    try {
      if (remember) {
        const submitted = String(formData.get('email') ?? '').trim();
        if (submitted) {
          window.localStorage.setItem(REMEMBERED_EMAIL_KEY, submitted);
        }
      } else {
        window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }
    } catch {
      /* si falla localStorage no bloqueamos el login */
    }
    return formAction(formData);
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="email"
          className="block text-xs font-medium uppercase tracking-wider text-slate-600"
        >
          Email
        </label>
        <div className="relative mt-1.5">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400"
          >
            <MailIcon />
          </span>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="tu@email.com"
            value={hydrated ? email : ''}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full rounded-md border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2"
            style={{
              ['--tw-ring-color' as string]: 'var(--brand-primary-ring)',
            }}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-xs font-medium uppercase tracking-wider text-slate-600"
        >
          Contraseña
        </label>
        <div className="relative mt-1.5">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400"
          >
            <LockIcon />
          </span>
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="block w-full rounded-md border border-slate-300 bg-white py-2.5 pl-10 pr-11 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2"
            style={{
              ['--tw-ring-color' as string]: 'var(--brand-primary-ring)',
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-1 my-1 flex items-center justify-center rounded-md px-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            tabIndex={-1}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 select-none">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="h-4 w-4 cursor-pointer rounded border-slate-300 text-slate-700 focus:ring-2 focus:ring-offset-0"
          style={{
            ['--tw-ring-color' as string]: 'var(--brand-primary-ring)',
            accentColor: 'var(--brand-primary)',
          }}
        />
        Recordar mi email en este dispositivo
      </label>

      {state.error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          <span aria-hidden className="mt-0.5 shrink-0 text-red-500">
            <AlertIcon />
          </span>
          <span>{state.error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-70"
        style={{
          background: 'var(--brand-primary)',
          color: 'var(--brand-foreground)',
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
        {pending ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}

function MailIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
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
      width="18"
      height="18"
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

function AlertIcon() {
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
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}
