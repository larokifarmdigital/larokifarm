import { HistoryListView, type HistoryListParams } from '@/features/history';

export const metadata = {
  title: 'Historial — Conciliador',
};

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Promise<HistoryListParams>;
}) {
  const params = await searchParams;
  return <HistoryListView params={params} />;
}
