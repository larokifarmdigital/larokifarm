'use client';

import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { EyeIcon, EyeSlashIcon } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { loginAction, type LoginState } from '@/lib/actions/auth-actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="accent" size="lg" disabled={pending} className="w-full mt-2">
      {pending ? (
        <>
          <span
            aria-hidden
            className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin"
          />
          Comprobando…
        </>
      ) : (
        'Entrar'
      )}
    </Button>
  );
}

export function LoginForm({ returnTo }: { returnTo?: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, {
    status: 'idle',
  });
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const emailErrId = useId();
  const passErrId = useId();

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  useEffect(() => {
    if (state.status === 'error') {
      errorRef.current?.focus();
    }
  }, [state]);

  const fieldError = state.status === 'error' ? state.fieldErrors : undefined;
  const generalError =
    state.status === 'error' && !fieldError ? state.message : undefined;

  return (
    <form action={formAction} noValidate className="space-y-5">
      {returnTo && (
        <input type="hidden" name="returnTo" value={returnTo} />
      )}

      <div>
        <Label htmlFor="email" required>
          Correo electrónico
        </Label>
        <Input
          ref={emailRef}
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="tu@farmacia.com"
          invalid={Boolean(fieldError?.email)}
          aria-describedby={fieldError?.email ? emailErrId : undefined}
          required
        />
        {fieldError?.email && (
          <p id={emailErrId} className="help help-error" role="alert">
            {fieldError.email}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="password" required>
          Contraseña
        </Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Tu contraseña"
            invalid={Boolean(fieldError?.password)}
            aria-describedby={fieldError?.password ? passErrId : undefined}
            className="pr-11"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-[4px] text-[var(--color-muted)] hover:text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] transition-colors"
          >
            {showPassword ? (
              <EyeSlashIcon size={16} weight="regular" />
            ) : (
              <EyeIcon size={16} weight="regular" />
            )}
          </button>
        </div>
        {fieldError?.password && (
          <p id={passErrId} className="help help-error" role="alert">
            {fieldError.password}
          </p>
        )}
      </div>

      {generalError && (
        <div
          ref={errorRef}
          role="alert"
          tabIndex={-1}
          className="px-3 py-2.5 rounded-[6px] bg-[var(--color-red-soft)] text-[var(--color-red-ink)] text-[13px] leading-[1.5] outline-none"
        >
          {generalError}
        </div>
      )}

      <SubmitButton />
    </form>
  );
}
