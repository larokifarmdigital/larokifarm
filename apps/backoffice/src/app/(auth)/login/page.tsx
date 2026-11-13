import { LoginView } from '@/features/auth';

export const metadata = { title: 'Iniciar sesión · Backoffice' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; callbackUrl?: string }>;
}) {
  // src/proxy.ts (Auth.js) redirige con ?callbackUrl=<url absoluta>.
  const { from, callbackUrl } = await searchParams;
  return <LoginView from={callbackUrl ?? from} />;
}
