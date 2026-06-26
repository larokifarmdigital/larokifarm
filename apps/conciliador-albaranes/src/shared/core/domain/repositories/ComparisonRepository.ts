/**
 * Port: contrato para leer y escribir comparaciones.
 *
 * El dominio NO conoce Prisma. La implementación (adapter) vive en
 * `features/comparisons/infrastructure/ComparisonRepositoryPrisma.ts`.
 */
import type {
  ComparisonDetail,
  ComparisonStatus,
  ListFilters,
  ListPagination,
  ListResult,
  Scope,
} from '../models/Comparison';
import type {
  AggregateOptions,
  BusinessBucket,
  MonthlyBucket,
  UserBucket,
} from '../models/Usage';

export interface ComparisonFileInput {
  kind: 'PDF_INPUT' | 'XLSX_INPUT' | 'REPORT_OUTPUT';
  filename: string;
  storageKey: string;
  sizeBytes: number;
}

export interface CreateComparisonInput {
  /** Si se proporciona, se usa como id; en otro caso lo asigna la BD. */
  id?: string;
  businessId: string;
  userId: string;
  durationMs: number;
  status: ComparisonStatus;
  proveedor: string | null;
  etiqueta: string | null;
  numPairs: number;
  numPdfs: number;
  numXlsx: number;
  numDiscrepancias: number;
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

  /**
   * Crea una comparación + sus archivos en una transacción. Devuelve el id.
   * `summary` se persiste tal cual en columna JSON.
   */
  create(input: CreateComparisonInput): Promise<{ id: string; createdAt: Date }>;

  /**
   * Agregaciones para el dashboard de uso. Cada método respeta el `scope` (RBAC).
   * `desde`/`hasta` opcionales acotan el rango en UTC.
   */
  aggregateByMonth(scope: Scope, opts: AggregateOptions): Promise<MonthlyBucket[]>;
  aggregateByUser(scope: Scope, opts: AggregateOptions): Promise<UserBucket[]>;
  aggregateByBusiness(scope: Scope, opts: AggregateOptions): Promise<BusinessBucket[]>;
}
