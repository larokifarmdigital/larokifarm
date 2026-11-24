import { getCurrentUser, puedeUsarModulo, requireModulo } from '@/core/auth';
import { getPriceListRepository } from '@/core/precios';
import { ListaView, type ListaParams } from '@/features/scout';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const u = await getCurrentUser();
  if (!u || !(await puedeUsarModulo(u.id, 'comparador'))) return { title: 'Lista · Backoffice' };
  const l = await getPriceListRepository().obtener((await params).id);
  return { title: `${l?.lista.nombre ?? 'Lista'} · Listas · Backoffice` };
}

export default async function ListaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<ListaParams> }) {
  const user = await requireModulo('comparador');
  const { id } = await params;
  return <ListaView id={id} params={await searchParams} esAdmin={user.rol === 'admin'} />;
}
