import { BrandMark } from '@/shared/components/atoms/BrandMark';
import { LoginForm } from '../components/LoginForm';

export function LoginView() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10">
      {/* Fondo decorativo: halos muy suaves en neutro */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-slate-300/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-32 h-[420px] w-[420px] rounded-full bg-slate-300/30 blur-3xl"
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl border border-slate-200/60 bg-white/95 p-8 shadow-xl shadow-slate-900/5 backdrop-blur-sm sm:p-10">
          <div className="mb-8 flex flex-col items-center text-center">
            <BrandMark size={56} />
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
              Conciliador de Albaranes
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Inicia sesión para continuar.
            </p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}
