import { requireModulo } from '@/core/auth';
import { HistorialPreciosView, type HistorialPreciosParams } from '@/features/scout';

export const metadata = { title: 'Historial de precios · Backoffice' };
export const dynamic = 'force-dynamic';

export default async function HistorialPreciosPage({ searchParams }: { searchParams: Promise<HistorialPreciosParams> }) {
  await requireModulo('comparador');
  return <HistorialPreciosView params={await searchParams} />;
}
