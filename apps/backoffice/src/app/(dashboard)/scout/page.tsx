import { requireUser } from '@/lib/session';
import { auth } from '@/lib/auth';
import { getScoutDashboard } from '@/features/scout/data/dashboardData';
import { ScoutDashboardView } from '@/features/scout/dashboard/ScoutDashboardView';

export const metadata = { title: 'Scout · Backoffice' };

export const dynamic = 'force-dynamic';

const DEFAULT_STANDALONE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://scout.larokifarm.com'
    : 'http://localhost:3002';

export default async function ScoutPage() {
  await requireUser();
  const session = await auth();
  const businessId = session?.user?.businessId ?? null;

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
