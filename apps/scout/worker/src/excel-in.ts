// Parseo del Excel de entrada. Columnas esperadas (case-insensitive):
// CN, EAN, Nombre, ClasificacionABCD. Filas con ClasificacionABCD='Muerto' se
// omiten cuando SKIP_MUERTO=true.

import * as XLSX from 'xlsx';

export interface ProductoRow {
  cn: string;
  ean: string;
  nombre: string;
  clasificacion: string;
}

export interface ParseResult {
  rows: ProductoRow[];
  totalDataRows: number;
  skippedMuerto: number;
  skippedInvalidCn: number;
  skippedSinNombre: number;
  headersDetectados: string[];
}

const HEADER_ALIASES = {
  cn: ['cn', 'código nacional', 'codigo nacional', 'idarticu', 'id articulo'],
  ean: ['ean', 'ean13', 'código ean', 'codigo ean', 'gtin'],
  nombre: ['nombre', 'descripcion', 'descripción', 'producto', 'articulo', 'artículo'],
  clasificacion: ['clasificacionabcd', 'clasificación abcd', 'clasificacion abcd', 'abcd', 'clasificacion'],
} as const;

function findHeaderIndex(headers: string[], aliases: readonly string[]): number {
  const normalized = headers.map((h) => h.toLowerCase().trim());
  for (const alias of aliases) {
    const idx = normalized.indexOf(alias);
    if (idx >= 0) return idx;
  }
  return -1;
}

function toCn(v: unknown): string | null {
  if (v == null) return null;
  const raw = typeof v === 'number' ? Math.trunc(v).toString() : String(v).trim();
  if (!/^\d+$/.test(raw)) return null;
  if (raw.length < 5 || raw.length > 7) return null;
  return raw.padStart(6, '0');
}

function toEan(v: unknown): string {
  if (v == null) return '';
  const raw = typeof v === 'number' ? Math.trunc(v).toString() : String(v).trim();
  if (!/^\d+$/.test(raw)) return '';
  return raw;
}

export function parseProductosXlsx(
  buf: ArrayBuffer,
  opts: { skipMuerto: boolean },
): ParseResult {
  const wb = XLSX.read(buf, {
    type: 'array',
    cellDates: false,
    cellNF: false,
    cellText: false,
    cellStyles: false,
    sheetStubs: false,
  });
  const firstSheet = wb.SheetNames[0];
  if (!firstSheet) throw new Error('Excel sin hojas');
  const sheet = wb.Sheets[firstSheet];

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: true,
    blankrows: false,
  }) as unknown[][];

  if (matrix.length < 2) {
    return {
      rows: [],
      totalDataRows: 0,
      skippedMuerto: 0,
      skippedInvalidCn: 0,
      skippedSinNombre: 0,
      headersDetectados: [],
    };
  }

  const headers = matrix[0].map((h) => String(h ?? '').trim());
  const idx = {
    cn: findHeaderIndex(headers, HEADER_ALIASES.cn),
    ean: findHeaderIndex(headers, HEADER_ALIASES.ean),
    nombre: findHeaderIndex(headers, HEADER_ALIASES.nombre),
    clasificacion: findHeaderIndex(headers, HEADER_ALIASES.clasificacion),
  };

  if (idx.cn < 0) {
    throw new Error(
      `Falta columna CN. Cabeceras detectadas: ${headers.join(', ')}`,
    );
  }
  if (idx.nombre < 0) {
    throw new Error(
      `Falta columna Nombre. Cabeceras detectadas: ${headers.join(', ')}`,
    );
  }

  const rows: ProductoRow[] = [];
  let skippedMuerto = 0;
  let skippedInvalidCn = 0;
  let skippedSinNombre = 0;
  const totalDataRows = matrix.length - 1;

  for (let i = 1; i < matrix.length; i++) {
    const r = matrix[i];

    const clasificacion =
      idx.clasificacion >= 0 ? String(r[idx.clasificacion] ?? '').trim() : '';

    if (opts.skipMuerto && clasificacion.toLowerCase() === 'muerto') {
      skippedMuerto += 1;
      continue;
    }

    const cn = toCn(r[idx.cn]);
    if (!cn) {
      skippedInvalidCn += 1;
      continue;
    }

    const nombre = String(r[idx.nombre] ?? '').trim();
    if (!nombre) {
      skippedSinNombre += 1;
      continue;
    }

    rows.push({
      cn,
      ean: idx.ean >= 0 ? toEan(r[idx.ean]) : '',
      nombre,
      clasificacion: clasificacion || 'unknown',
    });
  }

  return {
    rows,
    totalDataRows,
    skippedMuerto,
    skippedInvalidCn,
    skippedSinNombre,
    headersDetectados: headers,
  };
}
