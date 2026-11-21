'use client';

import { useMemo, useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import type { FarmaciaSummary } from '@/core/farmacias/domain';
import { FarmaciasCardList } from './FarmaciasCardList';
import type { RowActionRunner } from './FarmaciaRowActions';
import { FarmaciasEmptyState } from './FarmaciasEmptyState';
import { BUSCADOR_FARMACIAS_ID, FarmaciasListFilters } from './FarmaciasListFilters';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { FarmaciasTable } from './FarmaciasTable';
import { cumpleFiltro, type StatusFilter } from './statusMeta';

/** Sin acentos ni mayúsculas: "farmacia pediatrica" encuentra "Farmàcia Pediàtrica". */
const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function FarmaciasList({
  farmacias,
  canDuplicate = false,
  canWrite = true,
}: {
  farmacias: FarmaciaSummary[];
  canDuplicate?: boolean;
  canWrite?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('activas');
  const [pendingTx, startTransition] = useTransition();
  // Recién creada desde el modal «Nueva farmacia»: se resalta su fila.
  const creada = useSearchParams().get('creada') ?? undefined;

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return farmacias.filter((f) => {
      if (!cumpleFiltro(f, status)) return false;
      if (!q) return true;
      return (
        normalize(f.nombre).includes(q) ||
        normalize(f.ciudad ?? '').includes(q)
      );
    });
  }, [farmacias, query, status]);


  const hayFiltros = Boolean(query.trim()) || status !== 'activas';

  const runAction: RowActionRunner = (fn) =>
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        toast.error(e instanceof Error && e.message ? e.message : 'No se pudo completar la acción.');
      }
    });

  return (
    <section aria-label="Listado de farmacias">
      <FarmaciasListFilters
        query={query}
        onQueryChange={setQuery}
        status={status}
        onStatusChange={setStatus}
      />

      {/* Recuento visible + "Quitar filtros": misma fila que Usuarios e Historial */}
      <div className="mt-2 mb-3 flex min-h-11 items-center justify-between gap-3 px-1">
        <p role="status" className="m-0 text-[14px] text-[var(--color-muted)]">
          {filtered.length === 0
            ? 'No hay farmacias que coincidan.'
            : `${filtered.length} ${filtered.length === 1 ? 'farmacia' : 'farmacias'}${hayFiltros ? ' con estos filtros' : ''}`}
        </p>
        {hayFiltros && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setStatus('activas');
              document.getElementById(BUSCADOR_FARMACIAS_ID)?.focus();
            }}
            className="inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-[8px] px-3 text-[14px] font-medium text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-ink)]"
          >
            <NavIcon name="X" size={14} />
            Quitar filtros
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <FarmaciasEmptyState hasQuery={Boolean(query) || status !== 'activas'} totalCount={farmacias.length} />
      ) : (
        <>
          <FarmaciasCardList farmacias={filtered} resaltada={creada} pending={pendingTx} onAction={runAction} canDuplicate={canDuplicate} canWrite={canWrite} />
          <FarmaciasTable farmacias={filtered} resaltada={creada} pending={pendingTx} onAction={runAction} canDuplicate={canDuplicate} canWrite={canWrite} />
        </>
      )}
    </section>
  );
}
