import { prisma } from '@/shared/lib/prisma';
import type {
  CreateReportInput,
  Report,
  ReportCounts,
  ReportRepository,
  ResolveReportInput,
} from '../domain';

/* Prisma include shared by every read: brings author + resolver so the domain
   Report entity can be built in one query. */
const REPORT_INCLUDE = {
  user: { select: { id: true, name: true, email: true } },
  resolvedBy: { select: { id: true, name: true, email: true } },
} as const;

type PrismaReportRow = {
  id: string;
  comparisonId: string;
  note: string;
  status: 'OPEN' | 'RESOLVED';
  createdAt: Date;
  resolvedNote: string | null;
  resolvedAt: Date | null;
  user: { id: string; name: string; email: string };
  resolvedBy: { id: string; name: string; email: string } | null;
};

function toDomain(row: PrismaReportRow): Report {
  return {
    id: row.id,
    comparisonId: row.comparisonId,
    note: row.note,
    status: row.status,
    createdAt: row.createdAt,
    author: row.user,
    resolvedNote: row.resolvedNote,
    resolvedAt: row.resolvedAt,
    resolvedBy: row.resolvedBy,
  };
}

export class ReportRepositoryPrisma implements ReportRepository {
  async create(input: CreateReportInput): Promise<Report> {
    const row = await prisma.comparisonReport.create({
      data: {
        comparisonId: input.comparisonId,
        userId: input.userId,
        note: input.note,
      },
      include: REPORT_INCLUDE,
    });
    return toDomain(row);
  }

  async resolve(input: ResolveReportInput): Promise<Report | null> {
    /* updateMany + guard on status=OPEN so we don't clobber an already-resolved
       report. Then we re-fetch to hydrate relations for the response. */
    const { count } = await prisma.comparisonReport.updateMany({
      where: { id: input.reportId, status: 'OPEN' },
      data: {
        status: 'RESOLVED',
        resolvedById: input.resolvedById,
        resolvedNote: input.resolvedNote,
        resolvedAt: new Date(),
      },
    });
    if (count === 0) return null;
    const row = await prisma.comparisonReport.findUnique({
      where: { id: input.reportId },
      include: REPORT_INCLUDE,
    });
    return row ? toDomain(row) : null;
  }

  async findById(id: string): Promise<Report | null> {
    const row = await prisma.comparisonReport.findUnique({
      where: { id },
      include: REPORT_INCLUDE,
    });
    return row ? toDomain(row) : null;
  }

  async listByComparison(comparisonId: string): Promise<Report[]> {
    const rows = await prisma.comparisonReport.findMany({
      where: { comparisonId },
      orderBy: { createdAt: 'desc' },
      include: REPORT_INCLUDE,
    });
    return rows.map(toDomain);
  }

  async countByComparisonIds(
    ids: string[],
  ): Promise<Record<string, ReportCounts>> {
    if (ids.length === 0) return {};
    const grouped = await prisma.comparisonReport.groupBy({
      by: ['comparisonId', 'status'],
      where: { comparisonId: { in: ids } },
      _count: { _all: true },
    });
    const map: Record<string, ReportCounts> = {};
    for (const g of grouped) {
      const bucket = map[g.comparisonId] ?? { open: 0, resolved: 0 };
      if (g.status === 'OPEN') bucket.open = g._count._all;
      else bucket.resolved = g._count._all;
      map[g.comparisonId] = bucket;
    }
    return map;
  }
}
