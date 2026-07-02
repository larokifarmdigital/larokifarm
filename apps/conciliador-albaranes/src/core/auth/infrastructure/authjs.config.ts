import type { NextAuthConfig } from 'next-auth';

// NOTE: config edge-safe (sin Prisma ni bcrypt) usada por el middleware.
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
