import 'server-only';
import { prisma } from '@/lib/prisma';

export type ScoutDashboardData = {
  totalBatches: number;
  runningBatches: number;
  totalQueriesHistoric: number;
};

const EMPTY: ScoutDashboardData = {
  totalBatches: 0,
  runningBatches: 0,
  totalQueriesHistoric: 0,
};

// NOTE: hasta que el worker de scout persista snapshots en scout_batch_jobs
// / scout_batch_queries, estas queries siempre devolverán ceros. La estructura
// está lista para que la UI cambie sola cuando lleguen los primeros datos.
export async function getScoutDashboard(businessId: string | null): Promise<ScoutDashboardData> {
  if (!businessId) return EMPTY;

  const [total, running, queriesAgg] = await Promise.all([
    prisma.scoutBatchJob.count({ where: { businessId } }),
    prisma.scoutBatchJob.count({
      where: { businessId, status: { in: ['QUEUED', 'RUNNING'] } },
    }),
    prisma.scoutBatchJob.aggregate({
      where: { businessId },
      _sum: { totalQueries: true },
    }),
  ]);

  return {
    totalBatches: total,
    runningBatches: running,
    totalQueriesHistoric: queriesAgg._sum.totalQueries ?? 0,
  };
}
