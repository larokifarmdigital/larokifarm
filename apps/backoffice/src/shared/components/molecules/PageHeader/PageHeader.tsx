import type { ReactNode } from 'react';

/** Ancho único de las pantallas de lista (Inicio, Farmacias, Historial, Usuarios). */
export const ANCHO_PAGINA = 'mx-auto w-full max-w-6xl px-4 sm:px-6';

export function PageHeader({
  titulo,
  descripcion,
  accion,
}: {
  titulo: ReactNode;
  descripcion?: ReactNode;
  accion?: ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="m-0 text-[24px] sm:text-[28px] font-bold tracking-[-0.02em] text-[var(--color-ink)]">{titulo}</h1>
        {descripcion && <p className="m-0 mt-1 text-[15px] leading-[1.5] text-[var(--color-muted)]">{descripcion}</p>}
      </div>
      {accion && <div className="shrink-0">{accion}</div>}
    </header>
  );
}
