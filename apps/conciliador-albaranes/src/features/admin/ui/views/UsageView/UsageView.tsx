import { redirect } from 'next/navigation';
import { auth } from '@/core/auth';
import {
  GetBudgetStatusUseCase,
  GetUsageStatsUseCase,
  getComparisonRepository,
} from '@/core/comparisons';
import {
  ListBusinessesUseCase,
  getBusinessRepository,
} from '@/core/businesses';
import { KpiCards } from '../../components/KpiCards';
import { MonthlyChart } from '../../components/MonthlyChart';
import { TopUsersTable } from '../../components/TopUsersTable';
import { BusinessUsageTable } from '../../components/BusinessUsageTable';
import { BudgetStatusCard } from '../../components/BudgetStatusCard';

export async function UsageView() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role === 'USER') redirect('/');

  const isSuperAdmin = session.user.role === 'SUPER_ADMIN';

  const comparisonRepo = getComparisonRepository();
  const businessRepo = getBusinessRepository();

  const [stats, businesses, budgetStatus] = await Promise.all([
    new GetUsageStatsUseCase(comparisonRepo).execute(session),
    // NOTE: solo SUPER_ADMIN necesita el mapa slug→budget para pintar la columna Límite en BusinessUsageTable.
    isSuperAdmin
      ? new ListBusinessesUseCase(businessRepo).execute(session)
      : Promise.resolve([]),
    // NOTE: BUSINESS_ADMIN ve una card de su propio budget. SUPER_ADMIN lo ve en la tabla, no en card.
    !isSuperAdmin && session.user.businessId
      ? new GetBudgetStatusUseCase(businessRepo, comparisonRepo).execute(
          session.user.businessId,
        )
      : Promise.resolve(null),
  ]);

  const budgetBySlug = new Map(
    businesses.map((b) => [b.slug, b.monthlyBudgetUsd]),
  );

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Uso de la plataforma
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Métricas del mes en curso y evolución histórica.
          </p>
        </div>
        <span
          className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset"
          style={{
            background: 'var(--brand-primary-soft)',
            color: 'var(--brand-accent)',
            ['--tw-ring-color' as string]: 'var(--brand-primary-ring)',
          }}
        >
          {stats.context.currentMonthLabel}
        </span>
      </header>

      <KpiCards metrics={stats.currentMonth} />

      {budgetStatus && <BudgetStatusCard status={budgetStatus} />}

      <MonthlyChart buckets={stats.monthly} />

      <div className="space-y-6">
        <TopUsersTable rows={stats.topUsers} showBusiness={isSuperAdmin} />
        {isSuperAdmin && (
          <BusinessUsageTable
            rows={stats.byBusiness}
            budgetBySlug={budgetBySlug}
          />
        )}
      </div>

      <p className="text-[11px] text-slate-400">
        Los costes son estimados según los precios actuales de Gemini 2.5 Flash
        (input $0.30 / 1M tokens, output $2.50 / 1M tokens). Se actualizan en{' '}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-[10px]">
          core/engine/application/processAndPersistPair.ts
        </code>{' '}
        cuando cambien.
      </p>
    </main>
  );
}
