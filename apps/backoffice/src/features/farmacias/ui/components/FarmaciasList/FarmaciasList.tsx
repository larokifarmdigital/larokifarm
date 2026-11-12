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

export function FarmaciasList({ farmacias }: { farmacias: FarmaciaSummary[] }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('todos');
  const [pendingTx, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return farmacias.filter((f) => {
      if (status !== 'todos' && f.status !== status) return false;
      if (!q) return true;
      return (
        f.nombre.toLowerCase().includes(q) ||
        f.slug.toLowerCase().includes(q) ||
        (f.ciudad ?? '').toLowerCase().includes(q)
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
          <FarmaciasCardList farmacias={filtered} pending={pendingTx} onAction={runAction} />
          <FarmaciasTable farmacias={filtered} pending={pendingTx} onAction={runAction} />
        </>
      )}
    </section>
  );
}
