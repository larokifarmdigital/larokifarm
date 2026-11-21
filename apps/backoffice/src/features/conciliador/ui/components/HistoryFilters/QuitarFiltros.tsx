'use client';

import { useRouter } from 'next/navigation';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { BUSCADOR_ID } from './HistoryFilters';

/** "Quitar filtros": navega sin filtros y deja el foco en el buscador (si no, cae en <body>). */
export function QuitarFiltros({ href, className, conIcono = false }: { href: string; className: string; conIcono?: boolean }) {
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
      {conIcono && <NavIcon name="X" size={14} />}
      Quitar filtros
    </button>
  );
}
