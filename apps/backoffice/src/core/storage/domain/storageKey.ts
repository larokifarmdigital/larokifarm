// Layout de keys del conciliador: <businessSlug>/<YYYY-MM>/<comparisonId>/<kind>/<filename>.
export type FileKindKey = 'PDF_INPUT' | 'XLSX_INPUT' | 'REPORT_OUTPUT';

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
