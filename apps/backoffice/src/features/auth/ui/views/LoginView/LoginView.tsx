import { LoginForm } from '@/features/auth/ui/components/LoginForm';
import { BrandMark } from '@/shared/components/atoms/BrandMark';
import { supportMailto } from '@/shared/lib/support';

/**
 * Login en una sola columna: es una pantalla de uso diario, así que solo el
 * formulario (sin panel de marketing ni credenciales de demostración).
 */
export function LoginView({ from }: { from?: string }) {
  const ayudaAcceso = supportMailto('Problema para acceder al backoffice');

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center px-5 py-10 bg-[var(--color-bg)]"
    >
      <div className="w-full max-w-[400px]">
        <BrandMark size="lg" className="mb-10" />

        <div className="card p-7 sm:p-9">
          <h1 className="text-[26px] leading-[1.15] font-semibold tracking-[-0.03em] text-[var(--color-ink)] m-0">
            Entra en tu farmacia
          </h1>
          <p className="mt-2 text-[14px] leading-[1.5] text-[var(--color-muted)] text-pretty">
            Gestiona tu web y concilia los albaranes de tus proveedores.
          </p>

          <div className="mt-7">
            <LoginForm returnTo={from} />
          </div>
        </div>

        {ayudaAcceso && (
          <p className="mt-6 text-center text-[13px] text-[var(--color-muted)]">
            ¿Problemas para entrar o has olvidado la contraseña?{' '}
            <a
              href={ayudaAcceso}
              className="inline-block py-1 font-medium text-[var(--color-accent)] underline underline-offset-2 hover:decoration-2"
            >
              Escríbenos
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
