import type { NextAuthConfig } from 'next-auth';

/**
 * Configuración edge-safe de Auth.js (sin Prisma, sin bcrypt).
 *
 * Se usa en el middleware (que corre en runtime edge). El callback `authorized`
 * decide si la request continúa o se redirige a /login.
 */
export const authConfig = {
  pages: {
    signIn: '/login',
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname.startsWith('/login');

      if (isOnLogin) {
        if (isLoggedIn) {
          return Response.redirect(new URL('/', nextUrl));
        }
        return true;
      }

      return isLoggedIn;
    },
  },
  session: {
    strategy: 'jwt',
  },
} satisfies NextAuthConfig;
