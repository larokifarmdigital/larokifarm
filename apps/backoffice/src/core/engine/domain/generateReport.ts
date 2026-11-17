import XLSX from 'xlsx-js-style';
import { statusText } from './reconcile';
import type { ReconciledLine, Reconciliation } from './types';

const HEADERS = [
  'Código',
  'Descripción',
  'Uds pedido',
  'Uds albarán',
  'Bonif. alb.',
  'Precio pedido',
  'Precio albarán',
  'Dto pedido %',
  'Dto albarán %',
  'Estado / motivo',
] as const;

const COL_STATUS = HEADERS.length - 1;
const NUM_FROM = 2;
const NUM_TO = COL_STATUS - 1;

const HEADER_BG = '1E293B'; // slate-800
const HEADER_FG = 'FFFFFF';
const BAD_ROW = 'FEE2E2'; // red-100
const BAD_CELL = 'FCA5A5'; // red-300
const BAND = 'F1F5F9'; // slate-100 (alternating OK rows)
const BORDER = 'E2E8F0'; // slate-200

const border = {
  top: { style: 'thin', color: { rgb: BORDER } },
  bottom: { style: 'thin', color: { rgb: BORDER } },
  left: { style: 'thin', color: { rgb: BORDER } },
  right: { style: 'thin', color: { rgb: BORDER } },
};

function cellDiscrepant(l: ReconciledLine, col: number): boolean {
  // NOTE: 2,3=units · 4=freeUnits · 5,6=price · 7,8=discount.
  if (col === 2 || col === 3) return l.discrepancies.includes('units');
  if (col === 5 || col === 6) return l.discrepancies.includes('price');
  if (col === 7 || col === 8) return l.discrepancies.includes('discount');
  return false;
}

export function generateReport(c: Reconciliation): Uint8Array {
  const summary = c.allMatch ? 'TODO COINCIDE' : `${c.totalDiscrepancies} discrepancia(s)`;

  const aoa: unknown[][] = [
    [`Albarán: ${c.deliveryNoteNumber}`],
    [`Proveedor: ${c.supplier}`],
    [`Resultado: ${summary}`],
    [],
    [...HEADERS],
    ...c.lines.map((l) => [
      l.nationalCode,
      l.description,
      l.unitsOrdered ?? '',
      l.unitsDelivered ?? '',
      l.freeUnitsDelivered ? l.freeUnitsDelivered : '',
      l.priceOrdered ?? '',
      l.priceDelivered ?? '',
      l.discountOrdered ?? '',
      l.discountDelivered ?? '',
      statusText(l),
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [
    { wch: 12 }, { wch: 42 }, { wch: 11 }, { wch: 11 }, { wch: 11 },
    { wch: 13 }, { wch: 13 }, { wch: 12 }, { wch: 12 }, { wch: 34 },
  ];

  const set = (r: number, col: number, style: Record<string, unknown>) => {
    const addr = XLSX.utils.encode_cell({ r, c: col });
    if (ws[addr]) ws[addr].s = style;
  };

  for (let r = 0; r <= 2; r++) set(r, 0, { font: { bold: true, sz: 12 } });

  const HEADER_ROW = 4;
  for (let col = 0; col < HEADERS.length; col++) {
    set(HEADER_ROW, col, {
      font: { bold: true, color: { rgb: HEADER_FG } },
      fill: { patternType: 'solid', fgColor: { rgb: HEADER_BG } },
      alignment: { horizontal: col >= NUM_FROM && col <= NUM_TO ? 'right' : 'left', vertical: 'center' },
      border,
    });
  }

  c.lines.forEach((l, i) => {
    const r = HEADER_ROW + 1 + i;
    const badRow = l.status !== 'OK';
    for (let col = 0; col < HEADERS.length; col++) {
      const style: Record<string, unknown> = {
        border,
        alignment: { horizontal: col >= NUM_FROM && col <= NUM_TO ? 'right' : 'left', vertical: 'center' },
      };
      if (cellDiscrepant(l, col)) {
        style.fill = { patternType: 'solid', fgColor: { rgb: BAD_CELL } };
        style.font = { bold: true, color: { rgb: '7F1D1D' } };
      } else if (badRow) {
        style.fill = { patternType: 'solid', fgColor: { rgb: BAD_ROW } };
      } else if (i % 2 === 1) {
        style.fill = { patternType: 'solid', fgColor: { rgb: BAND } };
      }
      if (col === COL_STATUS && badRow) style.font = { bold: true, color: { rgb: '991B1B' } };
      set(r, col, style);
    }
  });

  const lastRow = HEADER_ROW + c.lines.length;
  ws['!autofilter'] = {
    ref: `${XLSX.utils.encode_cell({ r: HEADER_ROW, c: 0 })}:${XLSX.utils.encode_cell({
      r: lastRow,
      c: HEADERS.length - 1,
    })}`,
  };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Conciliación');

  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Uint8Array(buf);
}

export function reportFilename(c: Reconciliation, supplierNumber?: string): string {
  const clean = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '').trim() || 'albaran';
  const base = supplierNumber
    ? `${supplierNumber}_${c.supplier}`
    : c.supplier || c.deliveryNoteNumber;
  return `${clean(base)}.xlsx`;
}
