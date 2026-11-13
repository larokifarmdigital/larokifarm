import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/shared/lib/prisma';
import { authConfig } from './authjs.config';

/** Cada cuánto se re-valida el usuario de la sesión contra la BD. */
const RECHECK_MS = 5 * 60 * 1000;

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: { business: { select: { slug: true } } },
        });
        if (!user || !user.active) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          businessId: user.businessId,
          businessSlug: user.business?.slug ?? null,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.businessId = user.businessId;
        token.businessSlug = user.businessSlug;
        token.checkedAt = Date.now();
        return token;
      }
      // La sesión es un JWT de 30 días: cada pocos minutos se re-lee el
      // usuario para que desactivarlo o cambiarle el rol/negocio surta efecto
      // sin esperar a que caduque.
      if (token.sub && Date.now() - ((token.checkedAt as number | undefined) ?? 0) > RECHECK_MS) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { active: true, role: true, businessId: true, business: { select: { slug: true } } },
        });
        if (!fresh || !fresh.active) return null;
        token.role = fresh.role;
        token.businessId = fresh.businessId;
        token.businessSlug = fresh.business?.slug ?? null;
        token.checkedAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role;
        session.user.businessId = token.businessId;
        session.user.businessSlug = token.businessSlug;
      }
      return session;
    },
  },
});
