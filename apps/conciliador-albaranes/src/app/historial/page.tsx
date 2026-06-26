import { HistorialListView, type HistorialListParams } from '@/features/historial';

export const metadata = {
  title: 'Historial — Conciliador',
};

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Promise<HistorialListParams>;
}) {
  const params = await searchParams;
  return <HistorialListView params={params} />;
}
