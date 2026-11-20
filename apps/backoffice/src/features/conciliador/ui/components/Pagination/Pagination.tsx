import Link from 'next/link';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';

const BTN =
  'inline-flex items-center justify-center gap-1.5 min-h-11 px-4 rounded-[8px] border border-[var(--color-hairline-strong)] bg-[var(--color-surface)] text-[14.5px] font-medium';

/** "Anterior · Página X de Y · Siguiente". No se pinta si hay una sola página. */
export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  const hayAnterior = page > 1;
  const haySiguiente = page < totalPages;

  return (
    <nav aria-label="Páginas del historial" className="mt-6 flex items-center justify-between gap-3">
      {hayAnterior ? (
        <Link href={buildHref(page - 1)} className={cn(BTN, 'text-[var(--color-ink)] hover:bg-[var(--color-surface-2)]')}>
          <NavIcon name="CaretLeft" size={15} />
          Anterior
        </Link>
      ) : (
        <span aria-hidden className={cn(BTN, 'invisible')}>
          Anterior
        </span>
      )}
      <p className="m-0 text-[14px] text-[var(--color-ink-2)]">
        Página {page} de {totalPages}
      </p>
      {haySiguiente ? (
        <Link href={buildHref(page + 1)} className={cn(BTN, 'text-[var(--color-ink)] hover:bg-[var(--color-surface-2)]')}>
          Siguiente
          <NavIcon name="CaretRight" size={15} />
        </Link>
      ) : (
        <span aria-hidden className={cn(BTN, 'invisible')}>
          Siguiente
        </span>
      )}
    </nav>
  );
}
