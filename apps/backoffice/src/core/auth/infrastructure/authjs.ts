import { createHash } from 'node:crypto';
import NextAuth, { CredentialsSignin } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/shared/lib/prisma';
import { authConfig } from './authjs.config';

/** Cada cuánto se re-valida el usuario de la sesión contra la BD (AUTH_RECHECK_MS solo para pruebas). */
const RECHECK_MS = Number(process.env.AUTH_RECHECK_MS) || 5 * 60 * 1000;

/** bcrypt solo usa los primeros 72 bytes: más largo no se acepta (ni al cambiarla ni al entrar). */
const MAX_BYTES_CONTRASENA = 72;

/** Sin «Mantener la sesión iniciada»: la sesión caduca a las 12 h (una jornada). Marcada: 30 días (máximo del JWT). */
const SESION_CORTA_MS = Number(process.env.AUTH_SESION_CORTA_MS) || 12 * 60 * 60 * 1000; // env solo para pruebas

const credentialsSchema = z.object({
  recordar: z.enum(['1', '']).optional(),
  email: z.string().email(),
  password: z.string().min(1).refine((p) => Buffer.byteLength(p, 'utf8') <= MAX_BYTES_CONTRASENA),
});

// Hash de una contraseña que nadie conoce: se compara aunque el usuario no
// exista, para que el tiempo de respuesta no delate qué correos hay.
const HASH_FICTICIO = bcrypt.hashSync(createHash('sha256').update(String(Date.now())).digest('hex'), 10);

/**
 * Huella de la contraseña guardada en el JWT (cifrado; la sesión no la expone).
 * Si la contraseña cambia, la huella deja de coincidir y la sesión se cierra
 * en la siguiente revalidación.
 */
function huellaContrasena(passwordHash: string): string {
  return createHash('sha256').update(passwordHash).digest('base64url').slice(0, 16);
}

/** Farmacias asignadas; la principal siempre cuenta aunque falte su fila. */
function farmaciasDe(principal: string | null, filas: { businessId: string }[]): string[] {
  const ids = new Set(filas.map((f) => f.businessId));
  if (principal) ids.add(principal);
  return [...ids];
}

/** Relee el usuario: null = la sesión ya no vale (desactivado, borrado o contraseña cambiada). */
async function releerUsuario(token: JWT, aceptarHuellaNueva: boolean): Promise<JWT | null> {
  const fresh = await prisma.user.findUnique({
    where: { id: token.sub! },
    select: {
      active: true,
      name: true,
      role: true,
      businessId: true,
      passwordHash: true,
      business: { select: { slug: true } },
      farmacias: { select: { businessId: true } },
    },
  });
  if (!fresh || !fresh.active) return null;
  const huella = huellaContrasena(fresh.passwordHash);
  // Sesiones anteriores a la huella: se adoptan una vez en vez de echar a todo el mundo.
  if (token.pv && token.pv !== huella && !aceptarHuellaNueva) return null;
  token.pv = huella;
  token.role = fresh.role;
  token.name = fresh.name;
  token.businessId = fresh.businessId;
  token.businessSlug = fresh.business?.slug ?? null;
  token.businessIds = farmaciasDe(fresh.businessId, fresh.farmacias);
  token.checkedAt = Date.now();
  return token;
}

/** Contraseña correcta pero cuenta desactivada (el `code` llega a la action de login). */
export class CuentaDesactivadaError extends CredentialsSignin {
  code = 'cuenta_desactivada';
}

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const { email, password, recordar } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: {
            business: { select: { slug: true } },
            farmacias: { select: { businessId: true } },
          },
        });
        if (!user) {
          await bcrypt.compare(password, HASH_FICTICIO);
          return null;
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        // Solo quien conoce la contraseña llega a saber que la cuenta está
        // desactivada: con una contraseña mala el mensaje es el genérico.
        if (!user.active) throw new CuentaDesactivadaError();

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          businessId: user.businessId,
          businessSlug: user.business?.slug ?? null,
          businessIds: farmaciasDe(user.businessId, user.farmacias),
          pv: huellaContrasena(user.passwordHash),
          recordar: recordar === '1',
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = user.role;
        token.businessId = user.businessId;
        token.businessSlug = user.businessSlug;
        token.businessIds = user.businessIds;
        token.pv = user.pv;
        token.checkedAt = Date.now();
        // Caducidad absoluta desde el login: no se alarga por usar la app.
        token.expiraEn = user.recordar ? undefined : Date.now() + SESION_CORTA_MS;
        return token;
      }
      if (typeof token.expiraEn === 'number' && Date.now() > token.expiraEn) return null;
      // "Cambiar mi contraseña" llama a unstable_update: la propia sesión adopta
      // la huella nueva (las demás sesiones abiertas de esa cuenta caen).
      if (trigger === 'update' && token.sub) return releerUsuario(token, true);
      // La sesión es un JWT de 30 días: cada pocos minutos se re-lee el
      // usuario para que desactivarlo o cambiarle el rol/negocio surta efecto
      // sin esperar a que caduque.
      // Tokens emitidos antes de las farmacias múltiples: se releen ya.
      if (token.sub && !Array.isArray(token.businessIds)) return releerUsuario(token, false);
      if (token.sub && Date.now() - ((token.checkedAt as number | undefined) ?? 0) > RECHECK_MS) {
        return releerUsuario(token, false);
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role;
        session.user.businessId = token.businessId;
        session.user.businessSlug = token.businessSlug;
        session.user.businessIds = token.businessIds ?? [];
      }
      return session;
    },
  },
});
