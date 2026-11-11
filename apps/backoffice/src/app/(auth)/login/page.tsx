import { LoginView } from '@/features/auth';

export const metadata = { title: 'Iniciar sesión · larokifarm' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  return <LoginView from={from} />;
}
