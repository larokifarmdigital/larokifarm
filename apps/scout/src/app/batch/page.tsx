import { cookies } from 'next/headers';
import { BATCH_COOKIE, verifyCookieValue } from '@/ui/actions/batchAuth';
import { BatchPanel, LoginForm } from '@/ui/features/batch';

export const metadata = {
  title: 'Comparación masiva · Scout',
  robots: { index: false, follow: false },
};

// El batch tarda horas — la ruta en sí no ejecuta el trabajo (lo hace el worker
// de Cloudflare), así que el timeout del Server Action es solo para responder.
export const maxDuration = 60;

export default async function BatchPage() {
  const store = await cookies();
  const cookieValue = store.get(BATCH_COOKIE.name)?.value;
  const authenticated = await verifyCookieValue(cookieValue);

  return authenticated ? <BatchPanel /> : <LoginForm />;
}
