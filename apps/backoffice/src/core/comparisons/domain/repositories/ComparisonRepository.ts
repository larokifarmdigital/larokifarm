import type { Scope } from '@/core/shared';
import type {
  ComparisonDetail,
  ComparisonStatus,
  ListFilters,
  ListPagination,
  ListResult,
} from '../models/Comparison';
import type {
  AggregateOptions,
  BusinessBucket,
  MonthlyBucket,
  MonthlyBusinessBucket,
  UserBucket,
} from '../models/Usage';

export interface ComparisonFileInput {
  kind: 'PDF_INPUT' | 'XLSX_INPUT' | 'REPORT_OUTPUT';
  filename: string;
  storageKey: string;
  sizeBytes: number;
}

export interface CreateComparisonInput {
  /** If provided, used as id; otherwise the DB assigns one. */
  id?: string;
  businessId: string;
  userId: string;
  durationMs: number;
  status: ComparisonStatus;
  supplier: string | null;
  label: string | null;
  numPairs: number;
  numPdfs: number;
  numXlsx: number;
  numDiscrepancies: number;
  geminiInputTokens: number;
  geminiOutputTokens: number;
  geminiCostUsd: number;
  summary: Record<string, unknown>;
  files: ComparisonFileInput[];
}

export interface ComparisonRepository {
  list(
    scope: Scope,
    filters: ListFilters,
    pagination: ListPagination,
  ): Promise<ListResult>;

  findById(scope: Scope, id: string): Promise<ComparisonDetail | null>;

  create(input: CreateComparisonInput): Promise<{ id: string; createdAt: Date }>;

  aggregateByMonth(scope: Scope, opts: AggregateOptions): Promise<MonthlyBucket[]>;
  aggregateByUser(scope: Scope, opts: AggregateOptions): Promise<UserBucket[]>;
  aggregateByBusiness(scope: Scope, opts: AggregateOptions): Promise<BusinessBucket[]>;
  /** Breakdown mes × negocio para gráficos apilados. */
  aggregateByMonthAndBusiness(
    scope: Scope,
    opts: AggregateOptions,
  ): Promise<MonthlyBusinessBucket[]>;
}
