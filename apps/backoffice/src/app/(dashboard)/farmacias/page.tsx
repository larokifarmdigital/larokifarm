import { redirect } from 'next/navigation';
import { requireUser } from '@/core/auth';
import { FarmaciasListView } from '@/features/farmacias';

export const metadata = { title: 'Farmacias · Backoffice' };

export default async function FarmaciasPage() {
  // El personal con una sola farmacia va directo a SU web ("Mi web"); con
  // varias ve la lista de las suyas (ya filtrada por tenant).
  const user = await requireUser();
  if (user.rol !== 'admin' && user.farmaciaIds.length <= 1) {
    redirect(user.farmaciaIds[0] ? `/farmacias/${user.farmaciaIds[0]}` : '/inicio');
  }
  return <FarmaciasListView />;
}
