import type { ReactNode } from 'react';

/** En móvil el selector de sección ya muestra el nombre: el h2 queda solo para lectores de pantalla. */
export function EditorSectionTitle({ title, hint }: { title: string; hint?: ReactNode }) {
  return (
    <div className="mb-6 lg:mb-8 pb-4 lg:pb-5 border-b border-[var(--color-hairline)]">
      <h2 data-titulo-seccion tabIndex={-1} className="outline-none sr-only lg:not-sr-only text-[30px] leading-[1.05] tracking-[-0.03em] font-medium text-[var(--color-ink)] m-0">
        {title}
      </h2>
      {hint && (
        <p className="m-0 lg:mt-2 text-[14px] leading-[1.5] text-[var(--color-muted)] max-w-[56ch]">
          {hint}
        </p>
      )}
    </div>
  );
}
