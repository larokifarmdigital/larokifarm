import type { ReactNode } from 'react';
import {
  CheckCircleIcon,
  ClockCounterClockwiseIcon,
  GlobeHemisphereWestIcon,
  ReceiptIcon,
} from '@phosphor-icons/react/dist/ssr';
import { LoginForm } from '@/features/auth/ui/components/LoginForm';
import { BrandMark } from '@/shared/components/atoms/BrandMark';

const QUE_PUEDES_HACER: { icono: ReactNode; titulo: string; texto: string }[] = [
  {
    icono: <GlobeHemisphereWestIcon size={20} weight="duotone" />,
    titulo: 'Tu web al día',
    texto: 'Horario, servicios, fotos y preguntas frecuentes, en todos tus idiomas.',
  },
  {
    icono: <ReceiptIcon size={20} weight="duotone" />,
    titulo: 'Albaranes conciliados',
    texto: 'Compara el albarán del proveedor con tu pedido y detecta diferencias.',
  },
  {
    icono: <ClockCounterClockwiseIcon size={20} weight="duotone" />,
    titulo: 'Historial y reportes',
    texto: 'Consulta cualquier conciliación y avisa de lo que no cuadra.',
  },
];

/**
 * Escritorio: panel de marca (qué se hace aquí) + formulario. Móvil: solo el
 * formulario, que es lo que importa con el pulgar.
 */
export function LoginView({ from }: { from?: string }) {
  return (
    <div className="flex min-h-[100dvh] bg-[var(--color-bg)]">
      <PanelMarca />

      <div className="relative isolate flex flex-1 flex-col">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 left-1/2 h-[520px] w-[760px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--color-accent-tint),transparent)]" />
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-[420px]">
            <div className="mb-8 flex justify-center lg:hidden">
              <BrandMark size="lg" />
            </div>

            <div className="card p-6 shadow-[0_12px_40px_-16px_rgba(11,24,41,0.18)] sm:p-9">
              <h1 className="m-0 text-[26px] font-semibold leading-[1.15] tracking-[-0.03em] text-[var(--color-ink)]">
                Entra en tu farmacia
              </h1>
              <p className="mt-2 text-pretty text-[14.5px] leading-[1.5] text-[var(--color-muted)]">
                Usa el correo y la contraseña que te dio el administrador.
              </p>

              <div className="mt-7">
                <LoginForm returnTo={from} />
              </div>
            </div>
          </div>
        </div>

        <footer className="pb-6 text-center text-[12.5px] text-[var(--color-muted-2)]">
          © {new Date().getFullYear()} Larokifarm
        </footer>
      </div>
    </div>
  );
}

/** Panel azul de la marca (solo escritorio): qué puedes hacer y una muestra del resultado. */
function PanelMarca() {
  return (
    <div
      className="relative isolate hidden w-[46%] max-w-[640px] flex-col justify-between overflow-hidden bg-[linear-gradient(155deg,#1265b5_0%,#0d5397_55%,#0a4576_100%)] px-12 py-10 text-white lg:flex xl:px-16"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/[0.06]" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-[#36a0da]/20 blur-2xl" />
        <div className="absolute right-16 bottom-40 h-40 w-40 rounded-full border border-white/10" />
      </div>

      <span className="inline-flex items-center gap-2.5">
        <span aria-hidden className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] bg-white text-[18px] font-semibold text-[var(--color-accent)]">
          L
        </span>
        <span className="text-[19px] font-semibold tracking-[-0.02em]">Larokifarm</span>
      </span>

      <div className="my-10">
        <p className="m-0 max-w-[22ch] text-[34px] font-bold leading-[1.12] tracking-[-0.03em] text-balance">
          Todo lo de tu farmacia, en un solo sitio.
        </p>

        <ul className="m-0 mt-9 flex list-none flex-col gap-5 p-0">
          {QUE_PUEDES_HACER.map((q) => (
            <li key={q.titulo} className="flex gap-3.5">
              <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-white/12 text-white ring-1 ring-white/15">
                {q.icono}
              </span>
              <span className="min-w-0">
                <span className="block text-[15.5px] font-bold">{q.titulo}</span>
                <span className="block text-[14px] leading-[1.5] text-white/80">{q.texto}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div aria-hidden className="w-full max-w-[360px] rounded-[12px] bg-white p-4 text-[var(--color-ink)] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13.5px] font-semibold">Conciliación terminada</span>
          <span className="chip chip-green">
            <CheckCircleIcon size={13} weight="fill" />
            Todo cuadra
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {[['Archivos', '2 PDF · 1 Excel'], ['Líneas revisadas', '48'], ['Diferencias', '0']].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between text-[13px]">
              <span className="text-[var(--color-muted)]">{k}</span>
              <span className="font-semibold tabular-nums">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
