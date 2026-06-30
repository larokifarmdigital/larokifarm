/**
 * View for /historial.
 *
 * Receives typed `searchParams` and orchestrates: parse filters → call the
 * repository (no use case because it's pure passthrough) → render.
 *
 * Server Component: the session is obtained here (not in the page) so the
 * page stays a thin routing wrapper.
 */
import { redirect } from 'next/navigation';
import { auth } from '@/core/auth';
import { scopeFromSession } from '@/core/shared';
import {
  getComparisonRepository,
  type ComparisonStatus,
} from '@/core/comparisons';
import { HistoryFilters } from '../components/HistoryFilters';
import { HistoryTable } from '../components/HistoryTable';
import { Pagination } from '../components/Pagination';

export interface HistoryListParams {
  from?: string;
  to?: string;
  status?: string;
  supplier?: string;
  business?: string;
  page?: string;
}

function parseStatus(raw?: string): ComparisonStatus | undefined {
  if (raw === 'OK' || raw === 'DISCREPANCIES' || raw === 'ERROR') return raw;
  return undefined;
}

function parseDate(raw?: string): Date | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function endOfDay(d: Date): Date {
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return end;
}

function buildHrefBuilder(sp: HistoryListParams) {
  return function buildHref(targetPage: number): string {
    const params = new URLSearchParams();
    if (sp.from) params.set('from', sp.from);
    if (sp.to) params.set('to', sp.to);
    if (sp.status) params.set('status', sp.status);
    if (sp.supplier) params.set('supplier', sp.supplier);
    if (sp.business) params.set('business', sp.business);
    params.set('page', String(targetPage));
    return `/historial?${params.toString()}`;
  };
}

export async function HistoryListView({ params }: { params: HistoryListParams }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const repo = getComparisonRepository();
  const toRaw = parseDate(params.to);

  const result = await repo.list(
    scopeFromSession(session),
    {
      from: parseDate(params.from),
      to: toRaw ? endOfDay(toRaw) : undefined,
      status: parseStatus(params.status),
      supplier: params.supplier?.trim() || undefined,
      businessSlug: params.business?.trim() || undefined,
    },
    { page: Math.max(1, Number(params.page) || 1) },
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">
          Historial de comparaciones
        </h1>
      </div>

      <div className="mb-4">
        <HistoryFilters showBusinessFilter={session.user.role === 'SUPER_ADMIN'} />
      </div>

      <HistoryTable rows={result.items} role={session.user.role} />
      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        total={result.total}
        buildHref={buildHrefBuilder(params)}
      />
    </main>
  );
}
