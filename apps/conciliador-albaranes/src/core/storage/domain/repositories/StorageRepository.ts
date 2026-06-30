/**
 * Port: contrato para subir / leer / borrar archivos del historial.
 *
 * Implementaciones (adapters):
 *   - `StorageLocal`  → disco local (dev).
 *   - `StorageSpaces` → DigitalOcean Spaces (prod, se añade en Fase 6).
 *
 * Layout del key (mismo en todos los adapters):
 *   <businessSlug>/<YYYY-MM>/<comparisonId>/<kind>/<filename>
 */

export type FileKindKey = 'PDF_INPUT' | 'XLSX_INPUT' | 'REPORT_OUTPUT';

export interface StorageRepository {
  upload(key: string, data: Buffer, contentType: string): Promise<void>;
  read(key: string): Promise<{ data: Buffer; contentType: string }>;
  getDownloadUrl(
    key: string,
    filename: string,
    expiresInSec?: number,
  ): Promise<string>;
  delete(key: string): Promise<void>;
}

export function buildStorageKey(params: {
  businessSlug: string;
  comparisonId: string;
  kind: FileKindKey;
  filename: string;
  createdAt?: Date;
}): string {
  const d = params.createdAt ?? new Date();
  const yyyymm = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  const safeName = sanitizeFilename(params.filename);
  return [
    params.businessSlug,
    yyyymm,
    params.comparisonId,
    params.kind,
    safeName,
  ].join('/');
}

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\:*?"<>|]+/g, '_').slice(0, 200);
}
