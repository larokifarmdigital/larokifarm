import { requireUser } from '@/core/auth';
import { ScoutDashboardView, getScoutDashboard } from '@/features/scout';

export const metadata = { title: 'Scout · Backoffice' };

export const dynamic = 'force-dynamic';

const DEFAULT_STANDALONE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://scout.larokifarm.com'
    : 'http://localhost:3002';

export default async function ScoutPage() {
  const user = await requireUser();
  const businessId = user.farmaciaId ?? null;

  const data = await getScoutDashboard(businessId);
  const standaloneUrl = process.env.SCOUT_STANDALONE_URL ?? DEFAULT_STANDALONE_URL;

  return (
    <ScoutDashboardView
      standaloneUrl={standaloneUrl}
      totalBatches={data.totalBatches}
      runningBatches={data.runningBatches}
      totalQueriesHistoric={data.totalQueriesHistoric}
    />
  );
}
