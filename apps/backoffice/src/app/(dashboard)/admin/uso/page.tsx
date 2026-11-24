import { redirect } from 'next/navigation';
import { requireUser } from '@/core/auth';
import { UsoView, getUsoIaData } from '@/features/admin';

export const metadata = { title: 'Uso de IA · Backoffice' };
export const dynamic = 'force-dynamic';

export default async function UsoPage({ searchParams }: { searchParams: Promise<{ mes?: string | string[] }> }) {
  const user = await requireUser();
  // Solo la cuenta de administración (el menú tampoco lo enseña al resto).
  if (user.rol !== 'admin') redirect('/inicio');
  const { mes } = await searchParams;
  return <UsoView data={await getUsoIaData(typeof mes === 'string' ? mes : undefined)} />;
}
