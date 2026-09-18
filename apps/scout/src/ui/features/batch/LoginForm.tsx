'use client';

import { useActionState } from 'react';
import { Button } from '@/ui/components/Button/Button';
import { AppShell } from '@/ui/components/AppShell';
import { loginBatchAction, type LoginActionState } from '@/ui/actions/batchActions';

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginActionState, FormData>(
    loginBatchAction,
    { status: 'idle' },
  );

  return (
    <AppShell>
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-6 py-16">
        <form action={formAction} className="w-full" data-reveal>
          <div className="glass-strong p-8">
            <span className="section-eyebrow">Acceso restringido</span>
            <h1 className="h-section h-display-gradient m-0 mt-3">
              Panel de comparación masiva
            </h1>
            <p className="mt-3 text-sm text-[color:var(--muted-foreground)]">
              Introduce la contraseña para poder ejecutar comparaciones masivas
              del catálogo entero.
            </p>

            <label className="mt-8 block">
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-[color:var(--muted)]">
                Contraseña
              </span>
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                autoFocus
                className="block w-full rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-white/[0.02] px-3 py-2.5 text-sm text-[color:var(--foreground-strong)] placeholder:text-[color:var(--muted)] backdrop-blur transition-colors duration-[var(--dur-fast)] focus:border-[color:var(--accent)] focus:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-glow)]"
              />
            </label>

            {state.status === 'error' && (
              <p className="mt-3 rounded-[var(--radius-sm)] border border-[color:var(--pastel-red-fg)]/25 bg-[color:var(--pastel-red-bg)] px-3 py-2 text-sm text-[color:var(--pastel-red-fg)]">
                {state.error}
              </p>
            )}

            <div className="mt-6">
              <Button type="submit" variant="primary" size="md" disabled={pending} className="w-full">
                {pending ? 'Comprobando…' : 'Entrar'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
