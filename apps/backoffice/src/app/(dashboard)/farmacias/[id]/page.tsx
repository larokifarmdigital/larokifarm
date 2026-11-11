import { FarmaciaEditorView, getFarmaciaEditorTitle } from '@/features/farmacias';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return { title: await getFarmaciaEditorTitle(id) };
}

export default async function FarmaciaEditorPage({ params }: Props) {
  const { id } = await params;
  return <FarmaciaEditorView id={id} />;
}
