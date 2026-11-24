import { requireModulo } from '@/core/auth';
import { ComparadorView } from '@/features/scout';

export const metadata = { title: 'Comparar precio · Backoffice' };
export const dynamic = 'force-dynamic';
// Las acciones de esta página consultan webs externas (una farmacia por llamada).
export const maxDuration = 60;

export default async function ComparadorPage({ searchParams }: { searchParams: Promise<{ cn?: string; auto?: string }> }) {
  await requireModulo('comparador');
  const { cn, auto } = await searchParams;
  const cnValido = cn && /^\d{6}$/.test(cn) ? cn : undefined;
  return <ComparadorView cnInicial={cnValido} autoConsultar={auto === '1' && !!cnValido} />;
}
