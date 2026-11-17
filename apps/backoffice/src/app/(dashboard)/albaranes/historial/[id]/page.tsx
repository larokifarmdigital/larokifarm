import { ComparisonDetailView } from '@/features/conciliador';

export const metadata = { title: 'Detalle · Conciliador' };
export const dynamic = 'force-dynamic';

export default async function ComparisonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ComparisonDetailView id={id} />;
}
