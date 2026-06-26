import { ComparisonDetailView } from '@/features/historial';

export const metadata = {
  title: 'Detalle — Historial',
};

export default async function ComparisonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ComparisonDetailView id={id} />;
}
