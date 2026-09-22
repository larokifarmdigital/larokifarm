import { notFound } from 'next/navigation';
import { contentRepository } from '@/lib/content-repository';
import { FarmaciaEditor } from '@/features/farmacias/editor/FarmaciaEditor';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const f = await contentRepository.getFarmacia(id);
  return { title: f ? `${f.nombre} · Backoffice` : 'Farmacia · Backoffice' };
}

export default async function FarmaciaEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const farmacia = await contentRepository.getFarmacia(id);
  if (!farmacia) notFound();

  return <FarmaciaEditor initial={farmacia} />;
}
