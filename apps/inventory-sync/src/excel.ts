import * as XLSX from 'xlsx';

export interface ParsedRow {
  cn: string;
  descripcion: string;
  clasificacion: string;
  stockLaroki: number;
  stockFarmaciasConso: number;
  ventasAnualesConso: number;
  pvp?: number;
}

const HEADERS = {
  cn: 'IdArticu',
  descripcion: 'Descripcion',
  clasificacion: 'ClasificacionABCD',
  stockLaroki: 'StockLaroki',
  stockFarmaciasConso: 'StockFarmaciasConso',
  ventasAnualesConso: 'VentasAnualesConso',
  pvp: 'PVP',
} as const;

function toNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const cleaned = v.replace(/\./g, '').replace(/,/g, '.').trim();
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function toCn(v: unknown): string | null {
  if (v == null) return null;
  const raw = typeof v === 'number' ? Math.trunc(v).toString() : String(v).trim();
  if (!/^\d+$/.test(raw)) return null;
  if (raw.length < 5 || raw.length > 7) return null;
  return raw.padStart(6, '0');
}

export function parseInventoryXlsx(buf: ArrayBuffer): {
  rows: ParsedRow[];
  skippedMuerto: number;
  skippedInvalidCn: number;
  totalDataRows: number;
} {
  const wb = XLSX.read(buf, {
    type: 'array',
    cellDates: false,
    cellNF: false,
    cellText: false,
    cellStyles: false,
    sheetStubs: false,
  });
  const firstSheet = wb.SheetNames[0];
  if (!firstSheet) throw new Error('Excel has no sheets');
  const sheet = wb.Sheets[firstSheet];

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: true,
    blankrows: false,
  }) as unknown[][];

  if (matrix.length < 2) {
    return { rows: [], skippedMuerto: 0, skippedInvalidCn: 0, totalDataRows: 0 };
  }

  const header = matrix[0].map((h) => String(h ?? '').trim());
  const idx = {
    cn: header.indexOf(HEADERS.cn),
    descripcion: header.indexOf(HEADERS.descripcion),
    clasificacion: header.indexOf(HEADERS.clasificacion),
    stockLaroki: header.indexOf(HEADERS.stockLaroki),
    stockFarmaciasConso: header.indexOf(HEADERS.stockFarmaciasConso),
    ventasAnualesConso: header.indexOf(HEADERS.ventasAnualesConso),
    pvp: header.indexOf(HEADERS.pvp),
  };

  if (idx.cn < 0 || idx.clasificacion < 0) {
    throw new Error(
      `Missing required columns. Found headers: ${header.join(', ')}`,
    );
  }

  const rows: ParsedRow[] = [];
  let skippedMuerto = 0;
  let skippedInvalidCn = 0;
  const totalDataRows = matrix.length - 1;

  for (let i = 1; i < matrix.length; i++) {
    const r = matrix[i];
    const clasificacion = String(r[idx.clasificacion] ?? '').trim();
    if (clasificacion.toLowerCase() === 'muerto') {
      skippedMuerto += 1;
      continue;
    }
    const cn = toCn(r[idx.cn]);
    if (!cn) {
      skippedInvalidCn += 1;
      continue;
    }
    rows.push({
      cn,
      descripcion: idx.descripcion >= 0 ? String(r[idx.descripcion] ?? '').trim() : '',
      clasificacion: clasificacion || 'unknown',
      stockLaroki: idx.stockLaroki >= 0 ? toNumber(r[idx.stockLaroki]) : 0,
      stockFarmaciasConso: idx.stockFarmaciasConso >= 0 ? toNumber(r[idx.stockFarmaciasConso]) : 0,
      ventasAnualesConso: idx.ventasAnualesConso >= 0 ? toNumber(r[idx.ventasAnualesConso]) : 0,
      pvp: idx.pvp >= 0 ? (toNumber(r[idx.pvp]) || undefined) : undefined,
    });
  }

  return { rows, skippedMuerto, skippedInvalidCn, totalDataRows };
}
