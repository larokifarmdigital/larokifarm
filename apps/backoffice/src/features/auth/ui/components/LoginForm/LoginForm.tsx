'use client';

import { useActionState, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import {
  EnvelopeSimpleIcon,
  EyeIcon,
  EyeSlashIcon,
  LockSimpleIcon,
  ProhibitIcon,
  WarningCircleIcon,
  WifiSlashIcon,
} from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/shared/components/atoms/Button';
import { Input } from '@/shared/components/atoms/Input';
import { Label } from '@/shared/components/atoms/Label';
import { IndicadorEleccion } from '@/shared/components/atoms/IndicadorEleccion';
import { LabelHelpIcon } from '@/shared/components/molecules/LabelHelpIcon';
import { cn } from '@/shared/lib/cn';
import { loginAction, type LoginState, type MotivoErrorLogin } from '@/features/auth/actions/authActions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="accent" size="lg" disabled={pending} className="w-full mt-1">
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

const AYUDA_RECORDAR =
  'Sin marcar, la sesión se cierra a las 12 horas: déjalo así en ordenadores compartidos. Marcada, no tendrás que volver a entrar en 30 días en este dispositivo.';

/** Mensaje de cada motivo: qué ha pasado y qué puede hacer la persona. */
const AVISOS: Record<Exclude<MotivoErrorLogin, 'campos'>, { tono: 'rojo' | 'ambar'; titulo: string; texto: string; icono: ReactNode }> = {
  credenciales: {
    tono: 'rojo',
    titulo: 'El correo o la contraseña no son correctos',
    texto: 'Revísalos y vuelve a intentarlo. Fíjate en que no estén activadas las mayúsculas.',
    icono: <WarningCircleIcon size={20} weight="fill" />,
  },
  desactivada: {
    tono: 'ambar',
    titulo: 'Tu cuenta está desactivada',
    texto: 'Ahora mismo no puedes entrar. Pide al administrador de Larokifarm que la vuelva a activar.',
    icono: <ProhibitIcon size={20} weight="bold" />,
  },
  servidor: {
    tono: 'rojo',
    titulo: 'No hemos podido comprobar tus datos',
    texto: 'Ha fallado la conexión con el servidor. Espera un momento y vuelve a intentarlo.',
    icono: <WifiSlashIcon size={20} weight="bold" />,
  },
};

export function LoginForm({ returnTo }: { returnTo?: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, {
    status: 'idle',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [mayusculas, setMayusculas] = useState(false);
  const [recordar, setRecordar] = useState(false);
  const recordarAyudaId = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);
  const avisoRef = useRef<HTMLDivElement>(null);
  const emailErrId = useId();
  const passErrId = useId();
  const mayusId = useId();

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const error = state.status === 'error' ? state : undefined;
  const fieldError = error?.motivo === 'campos' ? error.fieldErrors : undefined;
  const aviso = error && error.motivo !== 'campos' ? AVISOS[error.motivo] : undefined;

  // Foco donde está el problema: el primer campo mal o el aviso general.
  useEffect(() => {
    if (state.status !== 'error') return;
    if (state.motivo === 'campos') {
      (state.fieldErrors?.email ? emailRef : passRef).current?.focus();
    } else {
      avisoRef.current?.focus();
    }
  }, [state]);

  const detectarMayusculas = (e: KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') setMayusculas(e.getModifierState('CapsLock'));
  };

  const descPass = [fieldError?.password ? passErrId : null, mayusculas ? mayusId : null].filter(Boolean).join(' ') || undefined;

  return (
    <form action={formAction} noValidate className="space-y-5">
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}

      {aviso && (
        <div
          ref={avisoRef}
          role="alert"
          tabIndex={-1}
          className={cn(
            'flex gap-3 rounded-[8px] border px-3.5 py-3 outline-none',
            aviso.tono === 'rojo'
              ? 'border-[color-mix(in_srgb,var(--color-red-ink)_25%,transparent)] bg-[var(--color-red-soft)] text-[var(--color-red-ink)]'
              : 'border-[color-mix(in_srgb,var(--color-yellow-ink)_25%,transparent)] bg-[var(--color-yellow-soft)] text-[var(--color-yellow-ink)]',
          )}
        >
          <span aria-hidden className="mt-px shrink-0">
            {aviso.icono}
          </span>
          <div className="min-w-0 text-[13.5px] leading-[1.5]">
            <p className="m-0 font-bold">{aviso.titulo}</p>
            <p className="m-0 mt-0.5">{aviso.texto}</p>
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="email" required>
          Correo electrónico
        </Label>
        <div className="relative">
          <EnvelopeSimpleIcon
            aria-hidden
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
          />
          <Input
            // key: al volver con error se rellena con lo que escribió.
            key={error ? `e-${error.email}` : 'e'}
            ref={emailRef}
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="tu@farmacia.com"
            defaultValue={error?.email ?? ''}
            invalid={Boolean(fieldError?.email) || error?.motivo === 'credenciales'}
            aria-describedby={fieldError?.email ? emailErrId : undefined}
            className="pl-10"
            required
          />
        </div>
        {fieldError?.email && (
          <p id={emailErrId} className="help help-error">
            {fieldError.email}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="password" required>
          Contraseña
        </Label>
        <div className="relative">
          <LockSimpleIcon
            aria-hidden
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
          />
          <Input
            ref={passRef}
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Tu contraseña"
            invalid={Boolean(fieldError?.password) || error?.motivo === 'credenciales'}
            aria-describedby={descPass}
            onKeyDown={detectarMayusculas}
            onKeyUp={detectarMayusculas}
            onBlur={() => setMayusculas(false)}
            className="pl-10 pr-12"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={showPassword}
            className="absolute right-1 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-[6px] text-[var(--color-muted)] hover:text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] transition-colors"
          >
            {showPassword ? <EyeSlashIcon size={18} /> : <EyeIcon size={18} />}
          </button>
        </div>
        {fieldError?.password && (
          <p id={passErrId} className="help help-error">
            {fieldError.password}
          </p>
        )}
        {mayusculas && (
          <p id={mayusId} className="help flex items-center gap-1.5 !text-[var(--color-yellow-ink)]">
            <WarningCircleIcon aria-hidden size={14} weight="fill" />
            Tienes activadas las mayúsculas
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <label className="-mx-1 flex min-h-11 cursor-pointer items-center gap-3 rounded-[8px] px-1 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--color-accent)] has-[:focus-visible]:outline-offset-2">
          <input
            type="checkbox"
            name="recordar"
            value="1"
            checked={recordar}
            onChange={(e) => setRecordar(e.target.checked)}
            aria-describedby={recordarAyudaId}
            className="sr-only cursor-pointer"
          />
          <IndicadorEleccion tipo="checkbox" marcado={recordar} />
          <span className="text-[14px] text-[var(--color-ink-2)]">Mantener la sesión iniciada</span>
        </label>
        {/* Fuera del label: tocar el ⓘ no marca la casilla. */}
        <LabelHelpIcon ariaLabel="Qué significa mantener la sesión iniciada">{AYUDA_RECORDAR}</LabelHelpIcon>
        <span id={recordarAyudaId} className="sr-only">
          {AYUDA_RECORDAR}
        </span>
      </div>

      <SubmitButton />
    </form>
  );
}
