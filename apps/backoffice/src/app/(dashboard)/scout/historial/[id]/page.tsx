import { requireModulo } from '@/core/auth';
import { ConsultaPrecioView } from '@/features/scout';

export const metadata = { title: 'Consulta de precio · Backoffice' };
export const dynamic = 'force-dynamic';

export default async function ConsultaPrecioPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModulo('comparador');
  const { id } = await params;
  return <ConsultaPrecioView id={id} />;
}
