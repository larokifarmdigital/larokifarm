/**
 * Prisma adapter for the ComparisonRepository port.
 *
 * The only file in the app that translates the domain `Scope` and `ListFilters`
 * into a Prisma WHERE clause. If we change ORM tomorrow, only this file is
 * rewritten — the rest of the feature is unaffected.
 */
import { FileKind, type Prisma } from '@prisma/client';
import { prisma } from '@/shared/lib/prisma';
import type { Scope } from '@/core/shared';
import type {
  ComparisonDetail,
  ListFilters,
  ListPagination,
  ListResult,
} from '../domain/models/Comparison';
import {
  EMPTY_METRICS,
  periodFromDate,
  type AggregateOptions,
  type BusinessBucket,
  type MonthlyBucket,
  type UsageMetrics,
  type UserBucket,
} from '../domain/models/Usage';
import type {
  ComparisonRepository,
  CreateComparisonInput,
} from '../domain/repositories/ComparisonRepository';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function whereFromScope(scope: Scope): Prisma.ComparisonWhereInput {
  switch (scope.kind) {
    case 'all':
      return {};
    case 'business':
      return { businessId: scope.businessId };
    case 'user':
      return { userId: scope.userId };
  }
}

function whereFromFilters(
  scope: Scope,
  filters: ListFilters,
): Prisma.ComparisonWhereInput {
  const where: Prisma.ComparisonWhereInput = { ...whereFromScope(scope) };

  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) where.createdAt.gte = filters.from;
    if (filters.to) where.createdAt.lte = filters.to;
  }
  if (filters.status) where.status = filters.status;
  if (filters.supplier) {
    where.supplier = { contains: filters.supplier, mode: 'insensitive' };
  }
  if (filters.businessSlug && scope.kind === 'all') {
    where.business = { slug: filters.businessSlug };
  }
  return where;
}

export class ComparisonRepositoryPrisma implements ComparisonRepository {
  async list(
    scope: Scope,
    filters: ListFilters,
    pagination: ListPagination,
  ): Promise<ListResult> {
    const pageSize = Math.min(
      Math.max(1, pagination.pageSize ?? DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE,
    );
    const page = Math.max(1, pagination.page ?? 1);
    const skip = (page - 1) * pageSize;

    const where = whereFromFilters(scope, filters);

    const [rows, total] = await Promise.all([
      prisma.comparison.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          createdAt: true,
          status: true,
          supplier: true,
          label: true,
          numPdfs: true,
          numDiscrepancies: true,
          durationMs: true,
          geminiInputTokens: true,
          geminiOutputTokens: true,
          geminiCostUsd: true,
          user: { select: { id: true, name: true, email: true } },
          business: { select: { slug: true, name: true } },
        },
      }),
      prisma.comparison.count({ where }),
    ]);

    return {
      items: rows.map((r) => ({
        ...r,
        geminiCostUsd: r.geminiCostUsd.toString(),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async findById(scope: Scope, id: string): Promise<ComparisonDetail | null> {
    const where = { ...whereFromScope(scope), id };
    const row = await prisma.comparison.findFirst({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        business: { select: { id: true, slug: true, name: true } },
        files: {
          orderBy: { kind: 'asc' },
          select: {
            id: true,
            kind: true,
            filename: true,
            storageKey: true,
            sizeBytes: true,
          },
        },
      },
    });
    if (!row) return null;
    return { ...row, geminiCostUsd: row.geminiCostUsd.toString() };
  }

  async create(input: CreateComparisonInput): Promise<{ id: string; createdAt: Date }> {
    return prisma.$transaction(async (tx) => {
      const comparison = await tx.comparison.create({
        data: {
          ...(input.id ? { id: input.id } : {}),
          businessId: input.businessId,
          userId: input.userId,
          durationMs: input.durationMs,
          status: input.status,
          supplier: input.supplier,
          label: input.label,
          numPairs: input.numPairs,
          numPdfs: input.numPdfs,
          numXlsx: input.numXlsx,
          numDiscrepancies: input.numDiscrepancies,
          geminiInputTokens: input.geminiInputTokens,
          geminiOutputTokens: input.geminiOutputTokens,
          geminiCostUsd: input.geminiCostUsd.toFixed(6),
          summary: input.summary as Prisma.InputJsonValue,
        },
        select: { id: true, createdAt: true },
      });

      if (input.files.length > 0) {
        await tx.comparisonFile.createMany({
          data: input.files.map((f) => ({
            comparisonId: comparison.id,
            kind: FileKind[f.kind],
            filename: f.filename,
            storageKey: f.storageKey,
            sizeBytes: f.sizeBytes,
          })),
        });
      }

      return comparison;
    });
  }

  // ──────────────────────────────────────────────────────────────
  // Aggregations — Phase 5
  //
  // Pragmatic implementation: narrow `select` + JS reduce. Enough for
  // 5 pharmacies × hundreds of comparisons / month. If it grows, switch
  // to raw SQL with date_trunc + GROUP BY.
  // ──────────────────────────────────────────────────────────────

  private whereForAggregate(
    scope: Scope,
    opts: AggregateOptions,
  ): Prisma.ComparisonWhereInput {
    const where: Prisma.ComparisonWhereInput = { ...whereFromScope(scope) };
    if (opts.from || opts.to) {
      where.createdAt = {};
      if (opts.from) where.createdAt.gte = opts.from;
      if (opts.to) where.createdAt.lte = opts.to;
    }
    return where;
  }

  async aggregateByMonth(scope: Scope, opts: AggregateOptions): Promise<MonthlyBucket[]> {
    const rows = await prisma.comparison.findMany({
      where: this.whereForAggregate(scope, opts),
      select: AGG_SELECT,
    });
    const groups = new Map<string, MonthlyBucket>();
    for (const r of rows) {
      const period = periodFromDate(r.createdAt);
      const key = `${period.year}-${period.month}`;
      const bucket = groups.get(key) ?? { period, metrics: { ...EMPTY_METRICS } };
      addMetrics(bucket.metrics, r);
      groups.set(key, bucket);
    }
    return [...groups.values()].sort((a, b) => {
      if (a.period.year !== b.period.year) return a.period.year - b.period.year;
      return a.period.month - b.period.month;
    });
  }

  async aggregateByUser(scope: Scope, opts: AggregateOptions): Promise<UserBucket[]> {
    const rows = await prisma.comparison.findMany({
      where: this.whereForAggregate(scope, opts),
      select: {
        ...AGG_SELECT,
        user: { select: { id: true, name: true, email: true } },
        business: { select: { slug: true, name: true } },
      },
    });
    const groups = new Map<string, UserBucket>();
    for (const r of rows) {
      const key = r.user.id;
      const bucket =
        groups.get(key) ??
        {
          user: r.user,
          business: r.business,
          metrics: { ...EMPTY_METRICS },
        };
      addMetrics(bucket.metrics, r);
      groups.set(key, bucket);
    }
    return [...groups.values()].sort(
      (a, b) => b.metrics.geminiInputTokens + b.metrics.geminiOutputTokens
        - (a.metrics.geminiInputTokens + a.metrics.geminiOutputTokens),
    );
  }

  async aggregateByBusiness(
    scope: Scope,
    opts: AggregateOptions,
  ): Promise<BusinessBucket[]> {
    const rows = await prisma.comparison.findMany({
      where: this.whereForAggregate(scope, opts),
      select: {
        ...AGG_SELECT,
        business: { select: { id: true, slug: true, name: true } },
      },
    });
    const groups = new Map<string, BusinessBucket>();
    for (const r of rows) {
      const key = r.business.id;
      const bucket =
        groups.get(key) ??
        { business: r.business, metrics: { ...EMPTY_METRICS } };
      addMetrics(bucket.metrics, r);
      groups.set(key, bucket);
    }
    return [...groups.values()].sort((a, b) => b.metrics.geminiCostUsd - a.metrics.geminiCostUsd);
  }
}

// ──────────────────────────────────────────────────────────────
// Aggregation helpers
// ──────────────────────────────────────────────────────────────

const AGG_SELECT = {
  createdAt: true,
  status: true,
  numPdfs: true,
  numDiscrepancies: true,
  durationMs: true,
  geminiInputTokens: true,
  geminiOutputTokens: true,
  geminiCostUsd: true,
} satisfies Prisma.ComparisonSelect;

interface AggRow {
  status: 'OK' | 'DISCREPANCIES' | 'ERROR';
  numPdfs: number;
  numDiscrepancies: number;
  durationMs: number;
  geminiInputTokens: number;
  geminiOutputTokens: number;
  geminiCostUsd: Prisma.Decimal;
}

function addMetrics(m: UsageMetrics, row: AggRow): void {
  m.numComparisons += 1;
  if (row.status === 'OK') m.numOk += 1;
  else if (row.status === 'DISCREPANCIES') m.numDiscrepancies += 1;
  else m.numErrors += 1;
  m.numPdfs += row.numPdfs;
  m.numDiscrepancyItems += row.numDiscrepancies;
  m.geminiInputTokens += row.geminiInputTokens;
  m.geminiOutputTokens += row.geminiOutputTokens;
  m.geminiCostUsd += Number(row.geminiCostUsd);
  m.durationMsTotal += row.durationMs;
}
