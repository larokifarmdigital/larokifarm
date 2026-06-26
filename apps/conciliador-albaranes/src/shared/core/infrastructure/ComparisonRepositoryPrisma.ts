/**
 * Adapter Prisma del puerto ComparisonRepository.
 *
 * Único punto de la app que traduce el `Scope` y los `ListFilters` del dominio
 * a un WHERE de Prisma. Si mañana cambiamos de ORM, solo se reescribe este
 * archivo; el resto del feature ni se entera.
 */
import { FileKind, type Prisma } from '@prisma/client';
import { prisma } from '@/shared/lib/prisma';
import type {
  ComparisonDetail,
  ListFilters,
  ListPagination,
  ListResult,
  Scope,
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

  if (filters.desde || filters.hasta) {
    where.createdAt = {};
    if (filters.desde) where.createdAt.gte = filters.desde;
    if (filters.hasta) where.createdAt.lte = filters.hasta;
  }
  if (filters.estado) where.status = filters.estado;
  if (filters.proveedor) {
    where.proveedor = { contains: filters.proveedor, mode: 'insensitive' };
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
          proveedor: true,
          etiqueta: true,
          numPdfs: true,
          numDiscrepancias: true,
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
          proveedor: input.proveedor,
          etiqueta: input.etiqueta,
          numPairs: input.numPairs,
          numPdfs: input.numPdfs,
          numXlsx: input.numXlsx,
          numDiscrepancias: input.numDiscrepancias,
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
  // Agregaciones — Fase 5
  //
  // Implementación pragmática: query con select narrow → reduce en JS.
  // Suficiente para 5 farmacias × cientos comparaciones/mes. Si crece,
  // pasar a SQL raw con date_trunc + GROUP BY.
  // ──────────────────────────────────────────────────────────────

  private whereForAggregate(
    scope: Scope,
    opts: AggregateOptions,
  ): Prisma.ComparisonWhereInput {
    const where: Prisma.ComparisonWhereInput = { ...whereFromScope(scope) };
    if (opts.desde || opts.hasta) {
      where.createdAt = {};
      if (opts.desde) where.createdAt.gte = opts.desde;
      if (opts.hasta) where.createdAt.lte = opts.hasta;
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
// Helpers de agregación
// ──────────────────────────────────────────────────────────────

const AGG_SELECT = {
  createdAt: true,
  status: true,
  numPdfs: true,
  numDiscrepancias: true,
  durationMs: true,
  geminiInputTokens: true,
  geminiOutputTokens: true,
  geminiCostUsd: true,
} satisfies Prisma.ComparisonSelect;

interface AggRow {
  status: 'OK' | 'DISCREPANCIAS' | 'ERROR';
  numPdfs: number;
  numDiscrepancias: number;
  durationMs: number;
  geminiInputTokens: number;
  geminiOutputTokens: number;
  geminiCostUsd: Prisma.Decimal;
}

function addMetrics(m: UsageMetrics, row: AggRow): void {
  m.numComparisons += 1;
  if (row.status === 'OK') m.numOk += 1;
  else if (row.status === 'DISCREPANCIAS') m.numDiscrepancias += 1;
  else m.numErrors += 1;
  m.numPdfs += row.numPdfs;
  m.numDiscrepanciasItems += row.numDiscrepancias;
  m.geminiInputTokens += row.geminiInputTokens;
  m.geminiOutputTokens += row.geminiOutputTokens;
  m.geminiCostUsd += Number(row.geminiCostUsd);
  m.durationMsTotal += row.durationMs;
}
