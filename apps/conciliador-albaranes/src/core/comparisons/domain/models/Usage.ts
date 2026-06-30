/**
 * Usage metrics and aggregations for the reconciler.
 *
 * Built by grouping `Comparison` rows by dimension (month, user, business).
 * USD cost calculation happens in the use case using current Gemini prices
 * (`core/engine/application/...`).
 */

export interface UsageMetrics {
  numComparisons: number;
  numOk: number;
  numDiscrepancies: number;
  numErrors: number;
  numPdfs: number;
  /** Sum of `numDiscrepancies` across comparisons (item-level count). */
  numDiscrepancyItems: number;
  geminiInputTokens: number;
  geminiOutputTokens: number;
  geminiCostUsd: number;
  durationMsTotal: number;
}

export const EMPTY_METRICS: UsageMetrics = {
  numComparisons: 0,
  numOk: 0,
  numDiscrepancies: 0,
  numErrors: 0,
  numPdfs: 0,
  numDiscrepancyItems: 0,
  geminiInputTokens: 0,
  geminiOutputTokens: 0,
  geminiCostUsd: 0,
  durationMsTotal: 0,
};

/** Year + month 1-12 (UTC) — stable key for grouping. */
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
  /** If provided, restricts the aggregation to this range (UTC). */
  from?: Date;
  to?: Date;
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
