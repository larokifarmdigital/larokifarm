import { requireModulo } from '@/core/auth';
import { ListasView } from '@/features/scout';

export const metadata = { title: 'Listas · Backoffice' };
export const dynamic = 'force-dynamic';
// Las listas pequeñas se comparan aquí mismo, después de responder (after()).
export const maxDuration = 300;

export default async function ListasPage() {
  const user = await requireModulo('comparador');
  return <ListasView esAdmin={user.rol === 'admin'} />;
}
