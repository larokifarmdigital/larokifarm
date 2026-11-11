import type { NextAuthConfig } from 'next-auth';

// NOTE: config edge-safe (sin Prisma ni bcrypt). Usada por el middleware,
// que corre en el edge runtime y no soporta esas deps.
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
          return Response.redirect(new URL('/farmacias', nextUrl));
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
