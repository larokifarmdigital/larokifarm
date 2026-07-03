// NOTE: estado del presupuesto mensual del negocio (Coste Gemini USD del mes en curso vs monthlyBudgetUsd). Aviso amarillo al 80%, bloqueo duro al 100%.
import type { BusinessRepository } from '@/core/businesses';
import { startOfMonthUTC, type ComparisonRepository } from '../domain';

export type BudgetLevel = 'unlimited' | 'ok' | 'warning' | 'blocked';

export interface BudgetStatus {
  level: BudgetLevel;
  spentUsd: number;
  budgetUsd: number | null;
  percent: number;
  supportEmail: string | null;
}

export const BUDGET_WARN_RATIO = 0.8;

export class GetBudgetStatusUseCase {
  constructor(
    private readonly businessRepo: BusinessRepository,
    private readonly comparisonRepo: ComparisonRepository,
  ) {}

  async execute(businessId: string): Promise<BudgetStatus> {
    const business = await this.businessRepo.findById(businessId);
    if (!business) {
      return {
        level: 'unlimited',
        spentUsd: 0,
        budgetUsd: null,
        percent: 0,
        supportEmail: null,
      };
    }

    const startCurrent = startOfMonthUTC(new Date());
    const buckets = await this.comparisonRepo.aggregateByMonth(
      { kind: 'business', businessId },
      { from: startCurrent },
    );
    const spentUsd = buckets[0]?.metrics.geminiCostUsd ?? 0;
    const budgetUsd = business.monthlyBudgetUsd;

    let level: BudgetLevel;
    let percent: number;
    if (budgetUsd === null || budgetUsd <= 0) {
      level = 'unlimited';
      percent = 0;
    } else {
      percent = spentUsd / budgetUsd;
      if (percent >= 1) level = 'blocked';
      else if (percent >= BUDGET_WARN_RATIO) level = 'warning';
      else level = 'ok';
    }

    return {
      level,
      spentUsd,
      budgetUsd,
      percent,
      supportEmail: business.supportEmail,
    };
  }
}
