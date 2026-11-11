import { requireUser } from '@/core/auth';
import { DashboardView, getConciliadorDashboard } from '@/features/conciliador';

export const metadata = { title: 'Albaranes · Backoffice' };

// NOTE: siempre datos frescos. Cada conciliación cambia los KPIs y no queremos
// ver un panel obsoleto.
export const dynamic = 'force-dynamic';

const DEFAULT_STANDALONE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://conciliador.larokifarm.com'
    : 'http://localhost:3000';

export default async function AlbaranesPage() {
  const user = await requireUser();
  const businessId = user.farmaciaId ?? null;

  const data = await getConciliadorDashboard(businessId);
  const standaloneUrl = process.env.CONCILIADOR_STANDALONE_URL ?? DEFAULT_STANDALONE_URL;

  return <DashboardView data={data} standaloneUrl={standaloneUrl} />;
}
