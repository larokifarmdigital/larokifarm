/**
 * Use case for the usage dashboard (Phase 5).
 *
 * RBAC:
 *  - SUPER_ADMIN sees platform-wide aggregates + breakdown by business.
 *  - BUSINESS_ADMIN sees aggregates of THEIR business + breakdown by user.
 *  - USER does not enter (the page redirects earlier).
 *
 * Returns pre-built data (monthly evolution + current-month KPIs + top users
 * + breakdown by business when applicable). The view just renders — no
 * recomputation.
 */
import type { Session } from 'next-auth';
import { ForbiddenError, scopeFromSession } from '@/core/shared';
import {
  EMPTY_METRICS,
  addMonthsUTC,
  startOfMonthUTC,
  type BusinessBucket,
  type ComparisonRepository,
  type MonthlyBucket,
  type UsageMetrics,
  type UserBucket,
} from '../domain';

export const MONTHS_HISTORY_DEFAULT = 12;
export const TOP_USERS_LIMIT_DEFAULT = 5;

export interface UsageStats {
  /** Aggregated metrics for the current calendar month (UTC). */
  currentMonth: UsageMetrics;
  /** Monthly evolution, with gaps filled (no missing periods). */
  monthly: MonthlyBucket[];
  /** Top N users this month by tokens consumed. */
  topUsers: UserBucket[];
  /** Breakdown by business for the current month (SUPER_ADMIN only; empty otherwise). */
  byBusiness: BusinessBucket[];
  /** Used by the view header. */
  context: {
    role: Session['user']['role'];
    currentMonthLabel: string;
    monthsHistory: number;
  };
}

export class GetUsageStatsUseCase {
  constructor(private readonly repo: ComparisonRepository) {}

  async execute(
    actor: Session,
    opts: { monthsHistory?: number; topUsersLimit?: number } = {},
  ): Promise<UsageStats> {
    if (actor.user.role === 'USER') {
      throw new ForbiddenError('Only administrators can access the usage dashboard.');
    }
    const monthsHistory = opts.monthsHistory ?? MONTHS_HISTORY_DEFAULT;
    const topUsersLimit = opts.topUsersLimit ?? TOP_USERS_LIMIT_DEFAULT;

    const now = new Date();
    const startCurrent = startOfMonthUTC(now);
    const startHistory = addMonthsUTC(startCurrent, -(monthsHistory - 1));

    const scope = scopeFromSession(actor);

    const [monthlyRaw, currentMonthly, usersThisMonth, businessThisMonth] = await Promise.all([
      this.repo.aggregateByMonth(scope, { from: startHistory }),
      this.repo.aggregateByMonth(scope, { from: startCurrent }),
      this.repo.aggregateByUser(scope, { from: startCurrent }),
      actor.user.role === 'SUPER_ADMIN'
        ? this.repo.aggregateByBusiness(scope, { from: startCurrent })
        : Promise.resolve([] as BusinessBucket[]),
    ]);

    return {
      currentMonth: currentMonthly[0]?.metrics ?? { ...EMPTY_METRICS },
      monthly: fillMonthlyGaps(monthlyRaw, startHistory, startCurrent),
      topUsers: usersThisMonth.slice(0, topUsersLimit),
      byBusiness: businessThisMonth,
      context: {
        role: actor.user.role,
        currentMonthLabel: monthLabel(startCurrent),
        monthsHistory,
      },
    };
  }
}

function monthLabel(d: Date): string {
  // UI is in Spanish, so the month label stays in Spanish.
  const fmt = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });
  return fmt.format(d);
}

/**
 * Fills months with no data with an empty bucket so the chart has no visual
 * gaps. Range is [startInclusive, endInclusive] both at first-of-month UTC.
 */
function fillMonthlyGaps(
  buckets: MonthlyBucket[],
  startInclusive: Date,
  endInclusive: Date,
): MonthlyBucket[] {
  const map = new Map(
    buckets.map((b) => [`${b.period.year}-${b.period.month}`, b]),
  );
  const out: MonthlyBucket[] = [];
  let cursor = startInclusive;
  while (cursor.getTime() <= endInclusive.getTime()) {
    const period = {
      year: cursor.getUTCFullYear(),
      month: cursor.getUTCMonth() + 1,
    };
    const key = `${period.year}-${period.month}`;
    out.push(map.get(key) ?? { period, metrics: { ...EMPTY_METRICS } });
    cursor = addMonthsUTC(cursor, 1);
  }
  return out;
}
