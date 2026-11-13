'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { FarmaciaSummary } from '@/core/farmacias/domain';
import { FarmaciasCardList } from './FarmaciasCardList';
import type { RowActionRunner } from './FarmaciaRowActions';
import { FarmaciasEmptyState } from './FarmaciasEmptyState';
import { FarmaciasListFilters } from './FarmaciasListFilters';
import { FarmaciasTable } from './FarmaciasTable';
import type { StatusCounts, StatusFilter } from './statusMeta';

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
  const [status, setStatus] = useState<StatusFilter>('todos');
  const [pendingTx, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return farmacias.filter((f) => {
      if (status !== 'todos' && f.status !== status) return false;
      if (!q) return true;
      return (
        normalize(f.nombre).includes(q) ||
        normalize(f.slug).includes(q) ||
        normalize(f.ciudad ?? '').includes(q)
      );
    });
  }, [farmacias, query, status]);

  const counts = useMemo(() => {
    const c: StatusCounts = { todos: farmacias.length, published: 0, draft: 0, archived: 0 };
    for (const f of farmacias) c[f.status]++;
    return c;
  }, [farmacias]);

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
        counts={counts}
      />

      {filtered.length === 0 ? (
        <FarmaciasEmptyState hasQuery={Boolean(query) || status !== 'todos'} totalCount={farmacias.length} />
      ) : (
        <>
          <FarmaciasCardList farmacias={filtered} pending={pendingTx} onAction={runAction} canDuplicate={canDuplicate} canWrite={canWrite} />
          <FarmaciasTable farmacias={filtered} pending={pendingTx} onAction={runAction} canDuplicate={canDuplicate} canWrite={canWrite} />
        </>
      )}
    </section>
  );
}
