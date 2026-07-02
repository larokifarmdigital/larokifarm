import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { auth } from '@/core/auth';
import { Header } from '@/shared/components/organisms/Header';
import './globals.css';

export const metadata: Metadata = {
  title: 'Conciliador de Albaranes',
  description: 'Compara albaranes PDF contra el pedido y detecta discrepancias.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const businessSlug = session?.user?.businessSlug ?? undefined;

  return (
    <html lang="es" data-business={businessSlug}>
      <body className="min-h-screen bg-gray-50 antialiased">
        <Header />
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={4000}
        />
      </body>
    </html>
  );
}
