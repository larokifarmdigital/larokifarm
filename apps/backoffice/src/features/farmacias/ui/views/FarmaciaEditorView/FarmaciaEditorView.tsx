import { notFound, redirect } from 'next/navigation';
import { canEditContent, getCurrentUser, veLaWeb } from '@/core/auth';
import { getFarmaciaRepository } from '@/core/farmacias';
import { FarmaciaEditor } from '@/features/farmacias/ui/components/editor/FarmaciaEditor';

export async function getFarmaciaEditorTitle(id: string): Promise<string> {
  const f = await getFarmaciaRepository().getFarmacia(id);
  return f ? `${f.nombre} · Backoffice` : 'Farmacia · Backoffice';
}

export async function FarmaciaEditorView({ id }: { id: string }) {
  const [farmacia, user] = await Promise.all([getFarmaciaRepository().getFarmacia(id), getCurrentUser()]);
  if (!user) redirect('/login');
  // Sin "Editar la web" no se entra al editor (ni en solo consulta).
  if (!veLaWeb(user)) redirect('/inicio');
  if (!farmacia) notFound();

  return (
    <FarmaciaEditor
      initial={farmacia}
      readOnly={!user || !canEditContent(user)}
      esAdmin={user?.rol === 'admin'}
      volverA={user?.rol === 'admin' ? '/farmacias' : '/inicio'}
    />
  );
}
