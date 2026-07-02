import { redirect } from 'next/navigation';
import { auth } from '@/core/auth';
import { scopeFromSession } from '@/core/shared';
import {
  getComparisonRepository,
  type ComparisonStatus,
} from '@/core/comparisons';
import {
  ListBusinessesUseCase,
  getBusinessRepository,
} from '@/core/businesses';
import { HistoryFilters } from '../components/HistoryFilters';
import { HistoryTable } from '../components/HistoryTable';
import { HistoryQuickFilters } from '../components/HistoryQuickFilters';
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

export async function HistoryListView({
  params,
}: {
  params: HistoryListParams;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const isSuperAdmin = session.user.role === 'SUPER_ADMIN';
  const repo = getComparisonRepository();
  const toRaw = parseDate(params.to);

  const [result, businesses] = await Promise.all([
    repo.list(
      scopeFromSession(session),
      {
        from: parseDate(params.from),
        to: toRaw ? endOfDay(toRaw) : undefined,
        status: parseStatus(params.status),
        supplier: params.supplier?.trim() || undefined,
        businessSlug: params.business?.trim() || undefined,
      },
      { page: Math.max(1, Number(params.page) || 1) },
    ),
    isSuperAdmin
      ? new ListBusinessesUseCase(getBusinessRepository()).execute(session)
      : Promise.resolve([]),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Historial de comparaciones
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Consulta las conciliaciones anteriores y descarga sus archivos.
          </p>
        </div>
        {result.total > 0 && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset"
            style={{
              background: 'var(--brand-primary-soft)',
              color: 'var(--brand-accent)',
              ['--tw-ring-color' as string]: 'var(--brand-primary-ring)',
            }}
          >
            {result.total} {result.total === 1 ? 'resultado' : 'resultados'}
          </span>
        )}
      </header>

      <div className="mb-4 space-y-3">
        <HistoryQuickFilters />
        <HistoryFilters
          showBusinessFilter={isSuperAdmin}
          businesses={businesses.map((b) => ({ slug: b.slug, name: b.name }))}
        />
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
