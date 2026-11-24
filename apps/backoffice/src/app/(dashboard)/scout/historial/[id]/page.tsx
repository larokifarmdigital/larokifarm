import { requireModulo } from '@/core/auth';
import { ConsultaPrecioView } from '@/features/scout';

export const metadata = { title: 'Consulta de precio · Backoffice' };
export const dynamic = 'force-dynamic';

export default async function ConsultaPrecioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lista?: string; run?: string }>;
}) {
  await requireModulo('comparador');
  const { id } = await params;
  const { lista, run } = await searchParams;
  // Abierto desde una lista: "Volver" lleva a esa lista (ids con forma de cuid, nada más).
  const cuid = (v?: string) => (v && /^[a-z0-9]{20,40}$/.test(v) ? v : undefined);
  const l = cuid(lista);
  const r = cuid(run);
  return <ConsultaPrecioView id={id} volverA={l ? { href: `/scout/listas/${l}${r ? `?run=${r}` : ''}`, texto: 'Volver a la lista' } : undefined} />;
}
