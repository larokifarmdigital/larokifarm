import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Geist_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import * as Tooltip from '@radix-ui/react-tooltip';
import './globals.css';

// Gilroy — misma fuente que la landing de Farmàcia Torrents, para
// coherencia visual entre backoffice y sitio público del cliente.
const gilroy = localFont({
  src: [
    { path: '../assets/fonts/Gilroy-Regular.ttf', weight: '100 600', style: 'normal' },
    { path: '../assets/fonts/Gilroy-Black.ttf', weight: '700 900', style: 'normal' },
  ],
  variable: '--font-sans-family',
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono-family',
  weight: ['400', '500'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'larokifarm · Backoffice',
  description: 'Gestión de contenido y operaciones del ecosistema larokifarm.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${gilroy.variable} ${geistMono.variable}`}>
      <body>
        <a href="#main" className="skip-link">
          Ir al contenido principal
        </a>
        <Tooltip.Provider delayDuration={200} skipDelayDuration={100}>
          {children}
        </Tooltip.Provider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--color-surface)',
              color: 'var(--color-ink)',
              border: '1px solid var(--color-hairline)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-sans)',
            },
          }}
        />
      </body>
    </html>
  );
}
