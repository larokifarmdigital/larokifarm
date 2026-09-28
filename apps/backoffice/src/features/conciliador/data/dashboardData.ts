import 'server-only';
import type { ComparisonStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type DashboardKpis = {
  total: number;
  thisMonth: number;
  reportsOpen: number;
  costUsdThisMonth: number;
  monthlyBudgetUsd: number | null;
  budgetPct: number | null; // 0..100 · null si no hay budget
};

export type RecentComparison = {
  id: string;
  createdAt: Date;
  supplier: string | null;
  label: string | null;
  status: ComparisonStatus;
  numDiscrepancies: number;
  costUsd: number;
};

export type DashboardData = {
  hasBusiness: boolean;
  businessName: string | null;
  kpis: DashboardKpis;
  recent: RecentComparison[];
};

const EMPTY: DashboardData = {
  hasBusiness: false,
  businessName: null,
  kpis: {
    total: 0,
    thisMonth: 0,
    reportsOpen: 0,
    costUsdThisMonth: 0,
    monthlyBudgetUsd: null,
    budgetPct: null,
  },
  recent: [],
};

// NOTE: si el usuario no tiene business (SUPER_ADMIN sin farmacia asignada,
// caso raro), devolvemos vacío. En futuras iteraciones el SUPER_ADMIN podrá
// elegir farmacia con un selector.
export async function getConciliadorDashboard(businessId: string | null): Promise<DashboardData> {
  if (!businessId) return EMPTY;

  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const [business, total, thisMonth, reportsOpen, monthAgg, recentRaw] = await Promise.all([
    prisma.business.findUnique({
      where: { id: businessId },
      select: { name: true, monthlyBudgetUsd: true },
    }),
    prisma.comparison.count({ where: { businessId } }),
    prisma.comparison.count({ where: { businessId, createdAt: { gte: startOfMonth } } }),
    prisma.comparisonReport.count({
      where: { status: 'OPEN', comparison: { businessId } },
    }),
    prisma.comparison.aggregate({
      where: { businessId, createdAt: { gte: startOfMonth } },
      _sum: { geminiCostUsd: true },
    }),
    prisma.comparison.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        createdAt: true,
        supplier: true,
        label: true,
        status: true,
        numDiscrepancies: true,
        geminiCostUsd: true,
      },
    }),
  ]);

  const costUsdThisMonth = monthAgg._sum.geminiCostUsd
    ? Number(monthAgg._sum.geminiCostUsd)
    : 0;
  const monthlyBudgetUsd = business?.monthlyBudgetUsd ? Number(business.monthlyBudgetUsd) : null;
  const budgetPct =
    monthlyBudgetUsd && monthlyBudgetUsd > 0
      ? Math.round((costUsdThisMonth / monthlyBudgetUsd) * 100)
      : null;

  return {
    hasBusiness: true,
    businessName: business?.name ?? null,
    kpis: {
      total,
      thisMonth,
      reportsOpen,
      costUsdThisMonth,
      monthlyBudgetUsd,
      budgetPct,
    },
    recent: recentRaw.map((c) => ({
      id: c.id,
      createdAt: c.createdAt,
      supplier: c.supplier,
      label: c.label,
      status: c.status,
      numDiscrepancies: c.numDiscrepancies,
      costUsd: Number(c.geminiCostUsd),
    })),
  };
}
