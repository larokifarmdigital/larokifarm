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

      // /login siempre accesible: el proxy solo ve el JWT, no sabe si el
      // usuario sigue activo. Si se le redirigiera a /farmacias con una sesión
      // ya revocada, el servidor lo devolvería a /login → bucle infinito.
      // La página de login comprueba la sesión real (getCurrentUser).
      if (isOnLogin) return true;

      return isLoggedIn;
    },
  },
  session: {
    strategy: 'jwt',
  },
} satisfies NextAuthConfig;
