/**
 * Modelos de dominio para el historial de comparaciones.
 *
 * Re-exporta los enums de Prisma (son tipos puros, sin lógica de cliente) y
 * define las shapes que la capa de aplicación expone a la presentación. Así
 * la presentación NO importa nada de @prisma/client directamente y podemos
 * cambiar el adapter (ej. mañana Drizzle) sin tocar componentes.
 */
import type { ComparisonStatus, FileKind, Role } from '@prisma/client';

export { type ComparisonStatus, type FileKind, type Role };

export interface ComparisonRow {
  id: string;
  createdAt: Date;
  status: ComparisonStatus;
  proveedor: string | null;
  etiqueta: string | null;
  numPdfs: number;
  numDiscrepancias: number;
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
  desde?: Date;
  hasta?: Date;
  estado?: ComparisonStatus;
  proveedor?: string;
  /** Solo aplicable a SUPER_ADMIN. */
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

/**
 * Scope efectivo derivado del rol del usuario. La capa de infraestructura lo
 * traduce a WHERE concretos; el dominio no sabe SQL.
 */
export type Scope =
  | { kind: 'all' } // SUPER_ADMIN
  | { kind: 'business'; businessId: string } // BUSINESS_ADMIN
  | { kind: 'user'; userId: string }; // USER

export function scopeFromSession(session: {
  user: { id: string; role: Role; businessId: string | null };
}): Scope {
  const role = session.user.role;
  if (role === 'SUPER_ADMIN') return { kind: 'all' };
  if (role === 'BUSINESS_ADMIN') {
    if (!session.user.businessId) {
      // Defensiva: BUSINESS_ADMIN sin negocio = scope vacío (no ve nada)
      return { kind: 'business', businessId: '__none__' };
    }
    return { kind: 'business', businessId: session.user.businessId };
  }
  return { kind: 'user', userId: session.user.id };
}
