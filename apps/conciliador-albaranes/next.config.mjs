/** @type {import('next').NextConfig} */
// El conciliador vive ahora dentro del backoffice. Cambiar el destino desde
// Vercel (variable BACKOFFICE_URL + redeploy) cuando el cliente tenga dominio.
const BACKOFFICE_URL = (process.env.BACKOFFICE_URL ?? 'https://larokifarm.vercel.app').replace(/\/$/, '');

const nextConfig = {
  // SheetJS (`xlsx`) se resuelve como dependencia normal; nada especial aquí.
  async redirects() {
    // Solo en el deploy de Vercel: en local la app sigue siendo usable.
    if (!process.env.VERCEL) return [];
    return [
      {
        source: '/historial/:path*',
        destination: `${BACKOFFICE_URL}/albaranes/historial/:path*`,
        permanent: false,
      },
      {
        // Todo lo demás salvo /api/* y assets internos de Next.
        source: '/((?!api/|_next/).*)',
        destination: `${BACKOFFICE_URL}/albaranes`,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

// Habilita el acceso a los bindings de Cloudflare en `next dev` cuando se trabaja
// con OpenNext. No afecta a `next build` normal.
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
initOpenNextCloudflareForDev();
