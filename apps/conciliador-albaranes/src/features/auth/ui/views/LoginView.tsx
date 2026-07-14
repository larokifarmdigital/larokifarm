import { BrandMark } from '@/shared/components/atoms/BrandMark';
import { LoginForm } from '../components/LoginForm';

export function LoginView() {
  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10"
      style={{
        background:
          'radial-gradient(60% 55% at 15% 8%, var(--brand-primary-soft) 0%, transparent 60%), radial-gradient(65% 55% at 85% 100%, var(--brand-primary-soft) 0%, transparent 60%), linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
      }}
    >
      {/* Halos de marca — heredan el tono activo (índigo por defecto, brand del negocio si aplica) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
        style={{ background: 'var(--brand-primary)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-32 h-[420px] w-[420px] rounded-full opacity-25 blur-3xl"
        style={{ background: 'var(--brand-primary)' }}
      />
      {/* Grid pattern muy sutil */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          color: 'var(--brand-accent)',
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Ribbon superior con acento de marca */}
        <div
          aria-hidden
          className="mx-auto mb-0 h-1 w-24 rounded-full"
          style={{ background: 'var(--brand-primary)' }}
        />
        <div className="mt-6 rounded-2xl border border-slate-200/70 bg-white/95 p-8 shadow-2xl shadow-slate-900/10 backdrop-blur-sm sm:p-10">
          <div className="mb-8 flex flex-col items-center text-center">
            <div
              className="rounded-2xl p-3 shadow-sm ring-1 ring-inset"
              style={{
                background: 'var(--brand-primary-soft)',
                ['--tw-ring-color' as string]: 'var(--brand-primary-ring)',
              }}
            >
              <BrandMark size={48} />
            </div>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">
              Conciliador de Albaranes
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Inicia sesión para continuar.
            </p>
          </div>

          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Plataforma multi-farmacia · v1
        </p>
      </div>
    </div>
  );
}
