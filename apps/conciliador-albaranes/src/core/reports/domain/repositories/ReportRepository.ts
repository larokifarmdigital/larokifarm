import type { Report } from '../models/Report';

export interface CreateReportInput {
  comparisonId: string;
  userId: string;
  note: string;
}

export interface ResolveReportInput {
  reportId: string;
  resolvedById: string;
  resolvedNote: string;
}

export interface ReportCounts {
  open: number;
  resolved: number;
}

export interface ReportRepository {
  create(input: CreateReportInput): Promise<Report>;
  resolve(input: ResolveReportInput): Promise<Report | null>;
  findById(id: string): Promise<Report | null>;
  listByComparison(comparisonId: string): Promise<Report[]>;
  /** Counts by status keyed by comparisonId. Missing ids mean zero reports. */
  countByComparisonIds(ids: string[]): Promise<Record<string, ReportCounts>>;
}
