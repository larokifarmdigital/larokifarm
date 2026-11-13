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
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Nadie puede incrustar el backoffice en un iframe (clickjacking).
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        // Páginas (no /api): las rutas de imágenes ponen su propia CSP
        // restrictiva (sandbox) y esta la pisaría.
        source: '/((?!api/).*)',
        headers: [{ key: 'Content-Security-Policy', value: "frame-ancestors 'none'" }],
      },
    ];
  },
};

export default nextConfig;
