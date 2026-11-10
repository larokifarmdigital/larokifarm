import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'cdn.sanity.io' },
    ],
  },
  experimental: {
    // Fase C: uploads de imágenes vía server actions; default 1MB es muy poco.
    serverActions: { bodySizeLimit: '10mb' },
  },
  devIndicators: {
    position: 'bottom-right',
  },
};

export default nextConfig;
