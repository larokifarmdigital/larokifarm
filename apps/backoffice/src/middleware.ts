import NextAuth from 'next-auth';
import { authConfig } from '@/core/auth/infrastructure/authjs.config';

// NOTE: middleware corre en edge runtime → importa authjs.config DIRECTO (no por
// el barrel @/core/auth, que arrastra Prisma). authConfig va sin providers
// (Credentials + Prisma + bcrypt no funcionan en edge).
export const { auth: middleware } = NextAuth(authConfig);

export default middleware((req) => {
  // authConfig.callbacks.authorized ya decide todo; el body queda vacío.
});

export const config = {
  // Aplica a TODO excepto rutas técnicas y assets estáticos.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
