import { requireModulo } from '@/core/auth';
import { HistoryListView, type HistoryListParams } from '@/features/conciliador';

export const metadata = { title: 'Historial · Conciliador' };
export const dynamic = 'force-dynamic';

export default async function HistorialPage({ searchParams }: { searchParams: Promise<HistoryListParams> }) {
  await requireModulo('conciliador');
  return <HistoryListView params={await searchParams} />;
}
