import Link from 'next/link';
import { LoginForm } from '@/features/auth/LoginForm';

export const metadata = { title: 'Iniciar sesión · larokifarm' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;

  return (
    <div className="min-h-[100dvh] grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="hidden lg:flex flex-col justify-between p-12 bg-[var(--color-surface-2)] border-r border-[var(--color-hairline)]">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] bg-[var(--color-accent)] text-white text-[13px] font-semibold tracking-[-0.02em]"
          >
            l
          </span>
          <span className="text-[15px] font-medium tracking-[-0.015em] text-[var(--color-ink)]">
            larokifarm
          </span>
        </div>

        <div className="max-w-md">
          <p className="eyebrow mb-4">Backoffice</p>
          <h1 className="text-[44px] leading-[1.02] tracking-[-0.035em] font-medium text-[var(--color-ink)] m-0 text-balance">
            La herramienta para gestionar el contenido de tu farmacia.
          </h1>
          <p className="mt-6 text-[15px] leading-[1.5] text-[var(--color-muted)] max-w-md text-pretty">
            Textos, imágenes, servicios, horarios y publicación. Sin plantillas
            genéricas, sin capas técnicas: cambias lo que se ve en tu web al
            instante.
          </p>
        </div>

        <ul className="grid grid-cols-2 gap-3 max-w-md text-[13px] text-[var(--color-ink-2)]">
          <li className="card p-4">
            <div className="eyebrow mb-1.5" style={{ color: 'var(--color-accent)' }}>
              Multi-idioma
            </div>
            <div className="leading-[1.5]">Castellano, català, english — un clic.</div>
          </li>
          <li className="card p-4">
            <div className="eyebrow mb-1.5" style={{ color: 'var(--color-accent)' }}>
              Autosave
            </div>
            <div className="leading-[1.5]">Nunca pierdes cambios.</div>
          </li>
          <li className="card p-4">
            <div className="eyebrow mb-1.5" style={{ color: 'var(--color-accent)' }}>
              Preview real
            </div>
            <div className="leading-[1.5]">Ves cómo queda antes de publicar.</div>
          </li>
          <li className="card p-4">
            <div className="eyebrow mb-1.5" style={{ color: 'var(--color-accent)' }}>
              Atajos
            </div>
            <div className="leading-[1.5]">Diseñado para uso diario con teclado.</div>
          </li>
        </ul>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-12 bg-[var(--color-bg)]">
        <div className="w-full max-w-[380px]">
          <div className="lg:hidden mb-8 flex items-center gap-2">
            <span
              aria-hidden
              className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] bg-[var(--color-accent)] text-white text-[13px] font-semibold tracking-[-0.02em]"
            >
              l
            </span>
            <span className="text-[15px] font-medium tracking-[-0.015em] text-[var(--color-ink)]">
              larokifarm
            </span>
          </div>

          <h2 className="text-[24px] font-medium tracking-[-0.025em] text-[var(--color-ink)] m-0">
            Iniciar sesión
          </h2>
          <p className="mt-2 text-[14px] text-[var(--color-muted)] text-pretty">
            Accede al backoffice con tu correo profesional.
          </p>

          <div className="mt-8">
            <LoginForm returnTo={from} />
          </div>

          <details className="mt-8 text-[12px] text-[var(--color-muted)]">
            <summary className="cursor-pointer font-medium hover:text-[var(--color-ink-2)] transition-colors select-none">
              Datos de demostración
            </summary>
            <div className="mt-3 space-y-1.5">
              <div>
                <code className="font-mono text-[11px]">admin@larokifarm.com</code>{' '}
                / <code className="font-mono text-[11px]">demo1234</code>
              </div>
              <div>
                <code className="font-mono text-[11px]">marta@farmaciatorrents.com</code>{' '}
                / <code className="font-mono text-[11px]">demo1234</code>
              </div>
            </div>
          </details>

          <p className="mt-12 text-[12px] text-[var(--color-muted-2)]">
            ¿Problemas para acceder?{' '}
            <Link
              href="mailto:soporte@larokifarm.com"
              className="text-[var(--color-accent)] underline underline-offset-2 hover:decoration-2"
            >
              Escríbenos
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
