import 'server-only';
import { prisma } from '@/shared/lib/prisma';

/**
 * Coste de las traducciones con IA del editor (usage_entries, módulo TRADUCCION)
 * por negocio desde `desde`. `::text` para no fallar si la BD aún no tiene ese
 * valor del enum. Así el coste y el % coinciden con el límite mensual.
 */
async function costeTraduccionesPorNegocio(desde: Date): Promise<Map<string, number>> {
  const filas = await prisma.$queryRaw<{ businessId: string; total: unknown }[]>`
    SELECT "businessId", SUM("costUsd") AS total FROM "usage_entries"
    WHERE "module"::text = 'TRADUCCION' AND "createdAt" >= ${desde}
    GROUP BY "businessId"`;
  return new Map(filas.map((f) => [f.businessId, Number(f.total ?? 0)]));
}

export type UsoGlobalKpis = {
  totalCostUsdMonth: number;
  totalComparisonsMonth: number;
  totalDiscrepanciesMonth: number;
  totalReportsOpen: number;
};

export type UsoPerBusiness = {
  id: string;
  slug: string;
  name: string;
  comparisonsHistoric: number;
  comparisonsMonth: number;
  costUsdMonth: number;
  monthlyBudgetUsd: number | null;
  budgetPct: number | null;
  reportsOpen: number;
};

export type UsoData = {
  kpis: UsoGlobalKpis;
  perBusiness: UsoPerBusiness[];
};

function startOfMonthUtc(): Date {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// NOTE: solo se llama desde /admin/uso que ya está guardada por role.
// Vista SUPER_ADMIN: agrega TODOS los businesses.
export async function getUsoData(): Promise<UsoData> {
  const startOfMonth = startOfMonthUtc();

  const [businesses, monthAgg, monthCount, monthDiscrep, reportsOpen, traducciones] = await Promise.all([
    prisma.business.findMany({
      select: { id: true, slug: true, name: true, monthlyBudgetUsd: true },
      orderBy: { name: 'asc' },
    }),
    prisma.comparison.aggregate({
      where: { createdAt: { gte: startOfMonth } },
      _sum: { geminiCostUsd: true },
    }),
    prisma.comparison.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.comparison.count({
      where: { createdAt: { gte: startOfMonth }, status: 'DISCREPANCIES' },
    }),
    prisma.comparisonReport.count({ where: { status: 'OPEN' } }),
    costeTraduccionesPorNegocio(startOfMonth),
  ]);

  const perBiz: UsoPerBusiness[] = await Promise.all(
    businesses.map(async (b) => {
      const [comparisonsHistoric, comparisonsMonth, monthAgg, reports] = await Promise.all([
        prisma.comparison.count({ where: { businessId: b.id } }),
        prisma.comparison.count({
          where: { businessId: b.id, createdAt: { gte: startOfMonth } },
        }),
        prisma.comparison.aggregate({
          where: { businessId: b.id, createdAt: { gte: startOfMonth } },
          _sum: { geminiCostUsd: true },
        }),
        prisma.comparisonReport.count({
          where: { status: 'OPEN', comparison: { businessId: b.id } },
        }),
      ]);

      const costUsdMonth = Number(monthAgg._sum.geminiCostUsd ?? 0) + (traducciones.get(b.id) ?? 0);
      const monthlyBudgetUsd = b.monthlyBudgetUsd ? Number(b.monthlyBudgetUsd) : null;
      const budgetPct =
        monthlyBudgetUsd && monthlyBudgetUsd > 0
          ? Math.round((costUsdMonth / monthlyBudgetUsd) * 100)
          : null;

      return {
        id: b.id,
        slug: b.slug,
        name: b.name,
        comparisonsHistoric,
        comparisonsMonth,
        costUsdMonth,
        monthlyBudgetUsd,
        budgetPct,
        reportsOpen: reports,
      };
    }),
  );

  return {
    kpis: {
      totalCostUsdMonth:
        Number(monthAgg._sum.geminiCostUsd ?? 0) + [...traducciones.values()].reduce((a, b) => a + b, 0),
      totalComparisonsMonth: monthCount,
      totalDiscrepanciesMonth: monthDiscrep,
      totalReportsOpen: reportsOpen,
    },
    perBusiness: perBiz,
  };
}
