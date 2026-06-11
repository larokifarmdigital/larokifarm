/** @type {import('next').NextConfig} */
const nextConfig = {
  // SheetJS (`xlsx`) se resuelve como dependencia normal; nada especial aquí.
};

export default nextConfig;

// Habilita el acceso a los bindings de Cloudflare en `next dev` cuando se trabaja
// con OpenNext. No afecta a `next build` normal.
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
initOpenNextCloudflareForDev();
