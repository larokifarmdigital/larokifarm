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
  if (raw.length < 4 || raw.length > 7) return null;
  return raw.padStart(6, '0');
}

export function parseInventoryXlsx(buf: ArrayBuffer): {
  rows: ParsedRow[];
  skippedMuerto: number;
  skippedInvalidCn: number;
} {
  const wb = XLSX.read(buf, { type: 'array' });
  const firstSheet = wb.SheetNames[0];
  if (!firstSheet) throw new Error('Excel has no sheets');
  const sheet = wb.Sheets[firstSheet];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: true,
  });

  const rows: ParsedRow[] = [];
  let skippedMuerto = 0;
  let skippedInvalidCn = 0;

  for (const r of json) {
    const clasificacion = String(r[HEADERS.clasificacion] ?? '').trim();
    if (clasificacion.toLowerCase() === 'muerto') {
      skippedMuerto += 1;
      continue;
    }
    const cn = toCn(r[HEADERS.cn]);
    if (!cn) {
      skippedInvalidCn += 1;
      continue;
    }
    rows.push({
      cn,
      descripcion: String(r[HEADERS.descripcion] ?? '').trim(),
      clasificacion: clasificacion || 'unknown',
      stockLaroki: toNumber(r[HEADERS.stockLaroki]),
      stockFarmaciasConso: toNumber(r[HEADERS.stockFarmaciasConso]),
      ventasAnualesConso: toNumber(r[HEADERS.ventasAnualesConso]),
      pvp: toNumber(r[HEADERS.pvp]) || undefined,
    });
  }

  return { rows, skippedMuerto, skippedInvalidCn };
}
