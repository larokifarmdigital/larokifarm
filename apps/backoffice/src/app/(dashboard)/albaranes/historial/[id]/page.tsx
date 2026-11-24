import { requireModulo } from '@/core/auth';
import { ComparisonDetailView } from '@/features/conciliador';

export const metadata = { title: 'Detalle · Conciliador' };
export const dynamic = 'force-dynamic';

export default async function ComparisonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModulo('conciliador');
  const { id } = await params;
  return <ComparisonDetailView id={id} />;
}
