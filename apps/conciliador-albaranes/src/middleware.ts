import NextAuth from 'next-auth';
// Import directo al config edge-safe, no por el barrel: el barrel arrastra
// `authjs.ts` → `shared/core` → adapters Node (StorageLocal con `node:crypto`),
// que no existen en el runtime edge donde corre el middleware.
import { authConfig } from '@/features/auth/core/infrastructure/authjs.config';

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: [
    /*
     * Solo protege páginas. Las rutas /api/* manejan su propia auth devolviendo
     * 401 JSON en vez de redirigir a /login (mejor UX para clientes fetch).
     *
     * Excluye también assets estáticos.
     */
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
