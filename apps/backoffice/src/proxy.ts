import NextAuth from 'next-auth';
import { authConfig } from '@/core/auth/infrastructure/authjs.config';

// NOTE: importa authjs.config DIRECTO (no el barrel @/core/auth) para no
// cargar Prisma + bcrypt en cada petición: aquí solo hace falta leer el JWT.
// `callbacks.authorized` decide si deja pasar o redirige a /login.
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // Aplica a TODO excepto rutas técnicas y assets estáticos.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
