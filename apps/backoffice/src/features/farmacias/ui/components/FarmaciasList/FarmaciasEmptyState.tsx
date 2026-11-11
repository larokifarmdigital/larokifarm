import Link from 'next/link';
import { Button } from '@/shared/components/atoms/Button';
import { NavIcon } from '@/shared/components/atoms/NavIcon';

export function FarmaciasEmptyState({ hasQuery, totalCount }: { hasQuery: boolean; totalCount: number }) {
  if (hasQuery) {
    return (
      <div className="card p-12 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-[var(--color-surface-sunken)] flex items-center justify-center mb-4">
          <NavIcon
            name="MagnifyingGlassPlus"
            size={20}
            className="text-[var(--color-muted)]"
          />
        </div>
        <p className="text-[14px] text-[var(--color-ink-2)]">
          No hay farmacias que coincidan con la búsqueda.
        </p>
        <p className="mt-1 text-[13px] text-[var(--color-muted)]">
          Revisa los filtros o cambia el término de búsqueda.
        </p>
      </div>
    );
  }
  if (totalCount === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-[var(--color-accent-soft)] flex items-center justify-center mb-5">
          <NavIcon
            name="Storefront"
            size={24}
            weight="fill"
            className="text-[var(--color-accent)]"
          />
        </div>
        <h2 className="h-section m-0">Aún no hay farmacias</h2>
        <p className="mt-2 text-[14px] text-[var(--color-muted)] max-w-md mx-auto text-pretty">
          Crea la primera para empezar a publicar contenido en la web.
        </p>
        <div className="mt-6">
          <Button asChild variant="accent" size="md">
            <Link href="/farmacias/nueva">
              <NavIcon name="Plus" size={14} />
              Crear primera farmacia
            </Link>
          </Button>
        </div>
      </div>
    );
  }
  return null;
}
