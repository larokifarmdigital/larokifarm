// NOTE: SUPER_ADMIN ve todo + breakdown por negocio; BUSINESS_ADMIN ve solo su negocio + breakdown por usuario.
import type { Session } from 'next-auth';
import { ForbiddenError, scopeFromSession } from '@/core/shared';
import {
  EMPTY_METRICS,
  addMonthsUTC,
  startOfMonthUTC,
  type BusinessBucket,
  type ComparisonRepository,
  type MonthlyBucket,
  type MonthlyBusinessBucket,
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
  /** Same evolution but split by business (SUPER_ADMIN sin filtro; vacío en el resto). */
  monthlyByBusiness: MonthlyBusinessBucket[];
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
    opts: {
      monthsHistory?: number;
      topUsersLimit?: number;
      /** Filter (SUPER_ADMIN only). BUSINESS_ADMIN ya está limitado por scope. */
      businessSlug?: string;
    } = {},
  ): Promise<UsageStats> {
    if (actor.user.role === 'USER') {
      throw new ForbiddenError('Only administrators can access the usage dashboard.');
    }
    const monthsHistory = opts.monthsHistory ?? MONTHS_HISTORY_DEFAULT;
    const topUsersLimit = opts.topUsersLimit ?? TOP_USERS_LIMIT_DEFAULT;
    const businessSlug = opts.businessSlug || undefined;

    const now = new Date();
    const startCurrent = startOfMonthUTC(now);
    const startHistory = addMonthsUTC(startCurrent, -(monthsHistory - 1));

    const scope = scopeFromSession(actor);

    const showByBusiness = actor.user.role === 'SUPER_ADMIN' && !businessSlug;

    const [
      monthlyRaw,
      currentMonthly,
      usersThisMonth,
      businessThisMonth,
      monthlyByBusinessRaw,
    ] = await Promise.all([
      this.repo.aggregateByMonth(scope, { from: startHistory, businessSlug }),
      this.repo.aggregateByMonth(scope, { from: startCurrent, businessSlug }),
      this.repo.aggregateByUser(scope, { from: startCurrent, businessSlug }),
      showByBusiness
        ? this.repo.aggregateByBusiness(scope, { from: startCurrent })
        : Promise.resolve([] as BusinessBucket[]),
      showByBusiness
        ? this.repo.aggregateByMonthAndBusiness(scope, { from: startHistory })
        : Promise.resolve([] as MonthlyBusinessBucket[]),
    ]);

    return {
      currentMonth: currentMonthly[0]?.metrics ?? { ...EMPTY_METRICS },
      monthly: fillMonthlyGaps(monthlyRaw, startHistory, startCurrent),
      monthlyByBusiness: monthlyByBusinessRaw,
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
  const fmt = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });
  return fmt.format(d);
}

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
