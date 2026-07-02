import * as XLSX from 'xlsx';
import { parseNumber } from './numbers';
import type { OrderData } from './types';

// NOTE: descuento viene como 21 (no como 0,21).
function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function findColumn(headers: string[], candidates: string[]): string | undefined {
  const target = candidates.map(normalizeKey);
  for (const h of headers) {
    if (target.includes(normalizeKey(h))) return h;
  }
  return undefined;
}

export function readOrder(bytes: Uint8Array | ArrayBuffer): OrderData {
  const wb = XLSX.read(bytes, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return { lines: [] };

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  if (rows.length === 0) return { lines: [] };

  const headers = Object.keys(rows[0]);
  const colCN = findColumn(headers, ['CodigoArticulo']);
  const colAlt = findColumn(headers, ['CodigoAlternativo', 'CodigoEAN', 'EAN', 'CodigoBarras']);
  const colUnits = findColumn(headers, ['Unidades', 'UnidadesPedidas']);
  const colPrice = findColumn(headers, ['Precio']);
  const colDiscount = findColumn(headers, ['%Descuento', 'Descuento']);
  const colDesc = findColumn(headers, ['DescripcionArticulo', 'Descripcion']);
  const colSupplierNumber = findColumn(headers, ['CodigoProveedor', 'NumeroProveedor', 'NProveedor']);
  const colSupplierName = findColumn(headers, ['RazonSocial', 'NombreProveedor', 'Proveedor']);

  const lines = rows
    .map((row) => ({
      productCode: colCN ? String(row[colCN] ?? '') : '',
      alternativeCode: colAlt ? String(row[colAlt] ?? '') : '',
      description: colDesc ? String(row[colDesc] ?? '') : '',
      units: colUnits ? parseNumber(row[colUnits]) : 0,
      price: colPrice ? parseNumber(row[colPrice]) : 0,
      discount: colDiscount ? parseNumber(row[colDiscount]) : 0,
    }))
    .filter((l) => l.productCode.trim() !== '' || l.alternativeCode.trim() !== '');

  const firstRow = rows.find((r) => (colSupplierName ? String(r[colSupplierName] ?? '').trim() : ''));

  return {
    supplierNumber:
      colSupplierNumber && firstRow
        ? String(firstRow[colSupplierNumber] ?? '').trim() || undefined
        : undefined,
    supplierName:
      colSupplierName && firstRow
        ? String(firstRow[colSupplierName] ?? '').trim() || undefined
        : undefined,
    lines,
  };
}
