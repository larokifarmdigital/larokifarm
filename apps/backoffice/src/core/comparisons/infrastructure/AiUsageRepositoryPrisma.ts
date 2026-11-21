import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/lib/prisma';
import {
  ModuloIaNoMigradoError,
  type AiUsageEntryInput,
  type AiUsageRepository,
} from '../domain/repositories/AiUsageRepository';

const MODULO = 'TRADUCCION';

function esEnumNoMigrado(e: unknown): boolean {
  return e instanceof Error && /invalid input value for enum/i.test(e.message) && e.message.includes(MODULO);
}

/**
 * Lecturas con `"module"::text`: comparar como texto no falla aunque el enum
 * de la BD aún no tenga TRADUCCION (simplemente no hay filas).
 */
export class AiUsageRepositoryPrisma implements AiUsageRepository {
  async record(entry: AiUsageEntryInput): Promise<void> {
    try {
      await prisma.usageEntry.create({
        data: {
          businessId: entry.businessId,
          userId: entry.userId,
          module: MODULO,
          action: entry.action,
          costUsd: new Prisma.Decimal(entry.costUsd.toFixed(6)),
          tokensIn: entry.tokensIn,
          tokensOut: entry.tokensOut,
        },
      });
    } catch (e) {
      if (esEnumNoMigrado(e)) throw new ModuloIaNoMigradoError();
      throw e;
    }
  }

  async costSince(businessId: string, from: Date): Promise<number> {
    const r = await prisma.$queryRaw<{ total: Prisma.Decimal | null }[]>`
      SELECT SUM("costUsd") AS total FROM "usage_entries"
      WHERE "businessId" = ${businessId} AND "module"::text = ${MODULO} AND "createdAt" >= ${from}`;
    return Number(r[0]?.total ?? 0);
  }

  async countSince(filtro: { userId?: string; businessId?: string; from: Date }): Promise<number> {
    if (!filtro.userId && !filtro.businessId) return 0;
    const r = filtro.userId
      ? await prisma.$queryRaw<{ n: bigint }[]>`
          SELECT COUNT(*) AS n FROM "usage_entries"
          WHERE "userId" = ${filtro.userId} AND "module"::text = ${MODULO} AND "createdAt" >= ${filtro.from}`
      : await prisma.$queryRaw<{ n: bigint }[]>`
          SELECT COUNT(*) AS n FROM "usage_entries"
          WHERE "businessId" = ${filtro.businessId} AND "module"::text = ${MODULO} AND "createdAt" >= ${filtro.from}`;
    return Number(r[0]?.n ?? 0);
  }
}
