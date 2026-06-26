/**
 * Métricas y agregaciones de uso del conciliador.
 *
 * Se construyen agrupando `Comparison` por dimensión (mes, usuario, negocio).
 * El cálculo del coste USD se hace en el use case según los precios actuales
 * de Gemini (`features/admin/core/application/pricing.ts`).
 */

export interface UsageMetrics {
  numComparisons: number;
  numOk: number;
  numDiscrepancias: number;
  numErrors: number;
  numPdfs: number;
  numDiscrepanciasItems: number;
  geminiInputTokens: number;
  geminiOutputTokens: number;
  geminiCostUsd: number;
  durationMsTotal: number;
}

export const EMPTY_METRICS: UsageMetrics = {
  numComparisons: 0,
  numOk: 0,
  numDiscrepancias: 0,
  numErrors: 0,
  numPdfs: 0,
  numDiscrepanciasItems: 0,
  geminiInputTokens: 0,
  geminiOutputTokens: 0,
  geminiCostUsd: 0,
  durationMsTotal: 0,
};

/** Año + mes 1-12 (UTC) — clave estable para agrupar. */
export interface PeriodKey {
  year: number;
  month: number;
}

export interface MonthlyBucket {
  period: PeriodKey;
  metrics: UsageMetrics;
}

export interface UserBucket {
  user: { id: string; name: string; email: string };
  business: { slug: string; name: string } | null;
  metrics: UsageMetrics;
}

export interface BusinessBucket {
  business: { id: string; slug: string; name: string };
  metrics: UsageMetrics;
}

export interface AggregateOptions {
  /** Si se pasa, restringe a ese rango (UTC). */
  desde?: Date;
  hasta?: Date;
}

export function startOfMonthUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function addMonthsUTC(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
}

export function periodFromDate(d: Date): PeriodKey {
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

export function formatPeriod({ year, month }: PeriodKey): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}
