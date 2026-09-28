import { requireUser } from '@/lib/session';
import { auth } from '@/lib/auth';
import { getConciliadorDashboard } from '@/features/conciliador/data/dashboardData';
import { DashboardView } from '@/features/conciliador/dashboard/DashboardView';

export const metadata = { title: 'Albaranes · Backoffice' };

// NOTE: siempre datos frescos. Cada conciliación cambia los KPIs y no queremos
// ver un panel obsoleto.
export const dynamic = 'force-dynamic';

const DEFAULT_STANDALONE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://conciliador.larokifarm.com'
    : 'http://localhost:3000';

export default async function AlbaranesPage() {
  await requireUser();
  const session = await auth();
  const businessId = session?.user?.businessId ?? null;

  const data = await getConciliadorDashboard(businessId);
  const standaloneUrl = process.env.CONCILIADOR_STANDALONE_URL ?? DEFAULT_STANDALONE_URL;

  return <DashboardView data={data} standaloneUrl={standaloneUrl} />;
}
