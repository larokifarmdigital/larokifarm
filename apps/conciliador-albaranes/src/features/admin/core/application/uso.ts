/**
 * Use cases del dashboard de uso (Fase 5).
 *
 * RBAC:
 *  - SUPER_ADMIN ve agregados de toda la plataforma + desglose por negocio.
 *  - BUSINESS_ADMIN ve agregados de SU negocio + desglose por usuario.
 *  - USER no entra (la página redirige antes).
 *
 * El use case devuelve los datos ya preparados (evolución mensual + KPIs del
 * mes en curso + top usuarios + desglose por negocio si aplica). La view solo
 * pinta — no recalcula.
 */
import type { Session } from 'next-auth';
import {
  addMonthsUTC,
  EMPTY_METRICS,
  scopeFromSession,
  startOfMonthUTC,
  type BusinessBucket,
  type ComparisonRepository,
  type MonthlyBucket,
  type UsageMetrics,
  type UserBucket,
} from '@/shared/core';
import { ForbiddenError } from '../domain/errors';

export const MONTHS_HISTORY_DEFAULT = 12;
export const TOP_USERS_LIMIT_DEFAULT = 5;

export interface UsoStats {
  /** Métricas agregadas del mes natural en curso (UTC). */
  currentMonth: UsageMetrics;
  /** Evolución mensual rellenada (sin huecos). */
  monthly: MonthlyBucket[];
  /** Top N usuarios del mes en curso por tokens usados. */
  topUsers: UserBucket[];
  /** Desglose por negocio del mes en curso (solo SUPER_ADMIN; vacío si no). */
  byBusiness: BusinessBucket[];
  /** Para el header de la vista. */
  context: {
    role: Session['user']['role'];
    currentMonthLabel: string;
    monthsHistory: number;
  };
}

export class GetUsoStatsUseCase {
  constructor(private readonly repo: ComparisonRepository) {}

  async execute(
    actor: Session,
    opts: { monthsHistory?: number; topUsersLimit?: number } = {},
  ): Promise<UsoStats> {
    if (actor.user.role === 'USER') {
      throw new ForbiddenError('Solo administradores acceden al dashboard de uso.');
    }
    const monthsHistory = opts.monthsHistory ?? MONTHS_HISTORY_DEFAULT;
    const topUsersLimit = opts.topUsersLimit ?? TOP_USERS_LIMIT_DEFAULT;

    const now = new Date();
    const startCurrent = startOfMonthUTC(now);
    const startHistory = addMonthsUTC(startCurrent, -(monthsHistory - 1));

    const scope = scopeFromSession(actor);

    const [monthlyRaw, currentMonthly, usersThisMonth, businessThisMonth] = await Promise.all([
      this.repo.aggregateByMonth(scope, { desde: startHistory }),
      this.repo.aggregateByMonth(scope, { desde: startCurrent }),
      this.repo.aggregateByUser(scope, { desde: startCurrent }),
      actor.user.role === 'SUPER_ADMIN'
        ? this.repo.aggregateByBusiness(scope, { desde: startCurrent })
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
  const fmt = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });
  return fmt.format(d);
}

/**
 * Rellena los meses sin datos con bucket vacío para que el gráfico no tenga
 * huecos visuales. Recibe el rango [startInclusive, endInclusive] ambos en
 * primero-de-mes UTC.
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
