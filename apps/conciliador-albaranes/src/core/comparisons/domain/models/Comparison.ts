/**
 * Comparison domain models (history read/write).
 *
 * Re-exports Prisma enums (pure types, no client logic). The cross-core
 * `Scope` type lives in `core/shared`.
 */
import type { ComparisonStatus, FileKind } from '@prisma/client';

export { type ComparisonStatus, type FileKind };

export interface ComparisonRow {
  id: string;
  createdAt: Date;
  status: ComparisonStatus;
  supplier: string | null;
  label: string | null;
  numPdfs: number;
  numDiscrepancies: number;
  durationMs: number;
  geminiInputTokens: number;
  geminiOutputTokens: number;
  geminiCostUsd: string;
  user: { id: string; name: string; email: string };
  business: { slug: string; name: string };
}

export interface ComparisonFileRow {
  id: string;
  kind: FileKind;
  filename: string;
  storageKey: string;
  sizeBytes: number;
}

export interface ComparisonDetail extends ComparisonRow {
  business: { id: string; slug: string; name: string };
  files: ComparisonFileRow[];
}

export interface ListFilters {
  from?: Date;
  to?: Date;
  status?: ComparisonStatus;
  supplier?: string;
  /** Only applicable to SUPER_ADMIN. */
  businessSlug?: string;
}

export interface ListPagination {
  page?: number;
  pageSize?: number;
}

export interface ListResult {
  items: ComparisonRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
