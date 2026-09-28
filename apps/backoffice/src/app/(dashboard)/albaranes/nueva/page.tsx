import { requireUser } from '@/lib/session';
import { NuevaConciliacionView } from '@/features/conciliador/nueva/NuevaConciliacionView';

export const metadata = { title: 'Nueva conciliación · Backoffice' };

const DEFAULT_STANDALONE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://conciliador.larokifarm.com'
    : 'http://localhost:3000';

export default async function NuevaConciliacionPage() {
  await requireUser();
  const standaloneUrl = process.env.CONCILIADOR_STANDALONE_URL ?? DEFAULT_STANDALONE_URL;
  return <NuevaConciliacionView standaloneUrl={standaloneUrl} />;
}
