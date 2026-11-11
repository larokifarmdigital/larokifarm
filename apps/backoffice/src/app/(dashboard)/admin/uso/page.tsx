import { redirect } from 'next/navigation';
import { requireUser } from '@/core/auth';
import { UsoView, getUsoData } from '@/features/admin';

export const metadata = { title: 'Uso · Backoffice' };
export const dynamic = 'force-dynamic';

export default async function UsoPage() {
  const user = await requireUser();
  // Doble guard: el sidebar oculta el link, pero si el user teclea la URL
  // manualmente le redirigimos. SUPER_ADMIN mapea a 'admin' en el adapter
  // de session.ts.
  if (user.rol !== 'admin') redirect('/farmacias');

  const data = await getUsoData();
  return <UsoView data={data} />;
}
