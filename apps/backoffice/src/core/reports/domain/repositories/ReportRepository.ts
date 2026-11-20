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

/** Informe abierto con el contexto mínimo para listarlo (Inicio del admin). */
export interface OpenReportItem {
  id: string;
  comparisonId: string;
  note: string;
  createdAt: Date;
  supplier: string | null;
  businessName: string;
}

export interface ReportRepository {
  create(input: CreateReportInput): Promise<Report>;
  resolve(input: ResolveReportInput): Promise<Report | null>;
  findById(id: string): Promise<Report | null>;
  listByComparison(comparisonId: string): Promise<Report[]>;
  /** Counts by status keyed by comparisonId. Missing ids mean zero reports. */
  countByComparisonIds(ids: string[]): Promise<Record<string, ReportCounts>>;
  /** Informes abiertos más recientes (solo SUPER_ADMIN: sin filtro de negocio). */
  listOpen(limit: number): Promise<OpenReportItem[]>;
}
