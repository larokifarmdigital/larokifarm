import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { Header } from '@/shared/components/organisms/Header';
import './globals.css';

export const metadata: Metadata = {
  title: 'Conciliador de Albaranes',
  description: 'Compara albaranes PDF contra el pedido y detecta discrepancias.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
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
