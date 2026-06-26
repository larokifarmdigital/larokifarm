/**
 * Vista de /admin/uso (Fase 5).
 *
 * Server Component: obtiene la sesión, invoca `GetUsoStatsUseCase` y pinta:
 *  - KPIs del mes en curso
 *  - Gráfico de evolución 12 meses (Recharts en client)
 *  - Top usuarios del mes
 *  - Desglose por negocio (solo SUPER_ADMIN)
 */
import { redirect } from 'next/navigation';
import { auth } from '@/features/auth';
import { getComparisonRepository } from '@/shared/core';
import { GetUsoStatsUseCase } from '../../../core';
import { KpiCards } from '../../components/KpiCards';
import { MonthlyChart } from '../../components/MonthlyChart';
import { TopUsersTable } from '../../components/TopUsersTable';
import { BusinessUsageTable } from '../../components/BusinessUsageTable';

export async function UsoView() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role === 'USER') redirect('/');

  const useCase = new GetUsoStatsUseCase(getComparisonRepository());
  const stats = await useCase.execute(session);

  const isSuperAdmin = session.user.role === 'SUPER_ADMIN';

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold text-gray-900">Uso de la plataforma</h1>
        <p className="text-sm text-gray-500">
          Mes en curso: <strong className="text-gray-700">{stats.context.currentMonthLabel}</strong>
        </p>
      </div>

      <KpiCards metrics={stats.currentMonth} />

      <MonthlyChart buckets={stats.monthly} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopUsersTable rows={stats.topUsers} showBusiness={isSuperAdmin} />
        {isSuperAdmin && <BusinessUsageTable rows={stats.byBusiness} />}
      </div>

      <p className="text-xs text-gray-400">
        Los costes son estimados según los precios actuales de Gemini 2.5 Flash
        (input $0.30 / 1M tokens, output $2.50 / 1M tokens). Actualiza los valores
        en <code>features/conciliador/core/application/procesarYPersistirParUseCase.ts</code>
        cuando cambien.
      </p>
    </main>
  );
}
