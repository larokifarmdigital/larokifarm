'use client';

import { useRouter } from 'next/navigation';
import { BUSCADOR_ID } from './HistoryFilters';

/** "Quitar filtros" del estado vacío: navega y deja el foco en el buscador (si no, cae en <body>). */
export function QuitarFiltros({ href, className }: { href: string; className: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        router.push(href, { scroll: false });
        document.getElementById(BUSCADOR_ID)?.focus();
      }}
    >
      Quitar filtros
    </button>
  );
}
