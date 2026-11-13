import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/core/auth';
import { NuevaFarmaciaView } from '@/features/farmacias';

export const metadata = { title: 'Nueva farmacia · Backoffice' };

export default async function NuevaFarmaciaPage() {
  // Solo SUPER_ADMIN crea farmacias (createFarmacia también lo valida).
  const user = await getCurrentUser();
  if (user?.rol !== 'admin') redirect('/farmacias');
  return <NuevaFarmaciaView />;
}
