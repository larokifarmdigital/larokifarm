import { notFound } from 'next/navigation';
import { canEditContent, getCurrentUser } from '@/core/auth';
import { getFarmaciaRepository } from '@/core/farmacias';
import { FarmaciaEditor } from '@/features/farmacias/ui/components/editor/FarmaciaEditor';

export async function getFarmaciaEditorTitle(id: string): Promise<string> {
  const f = await getFarmaciaRepository().getFarmacia(id);
  return f ? `${f.nombre} · Backoffice` : 'Farmacia · Backoffice';
}

export async function FarmaciaEditorView({ id }: { id: string }) {
  const [farmacia, user] = await Promise.all([getFarmaciaRepository().getFarmacia(id), getCurrentUser()]);
  if (!farmacia) notFound();

  return <FarmaciaEditor initial={farmacia} readOnly={!user || !canEditContent(user)} />;
}
