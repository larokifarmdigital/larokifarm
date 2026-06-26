import { PrismaClient } from '@prisma/client';

/**
 * Cliente Prisma singleton.
 *
 * En desarrollo Next.js reemplaza módulos en caliente. Sin el singleton, cada
 * recarga abre un PrismaClient nuevo y se agotan conexiones contra Postgres.
 * En producción solo se instancia una vez (por proceso del contenedor).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
