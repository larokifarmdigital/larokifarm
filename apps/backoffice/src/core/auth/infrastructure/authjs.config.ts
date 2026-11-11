import type { NextAuthConfig } from 'next-auth';

// NOTE: config ligera (sin Prisma ni bcrypt). Usada por src/proxy.ts,
// que solo necesita leer el JWT en cada petición.
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
