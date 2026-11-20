import { redirect } from 'next/navigation';
import { requireUser } from '@/core/auth';
import { FarmaciasListView } from '@/features/farmacias';

export const metadata = { title: 'Farmacias · Backoffice' };

export default async function FarmaciasPage() {
  // La lista es del administrador; el personal va directo a SU web ("Mi web").
  const user = await requireUser();
  if (user.rol !== 'admin') redirect(user.farmaciaId ? `/farmacias/${user.farmaciaId}` : '/inicio');
  return <FarmaciasListView />;
}
