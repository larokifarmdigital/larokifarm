import XLSX from 'xlsx-js-style';
import { estadoTexto } from './comparar';
import type { Conciliacion, LineaConciliada } from './tipos';

/**
 * Genera el informe .xlsx de una conciliación (§10) con estilos:
 * cabecera con color, filas con discrepancia en rojo y las celdas concretas que
 * no cuadran (uds / precio / dto) resaltadas. Usa `xlsx-js-style`.
 */

const CABECERAS = [
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

// Índice de la columna de estado y rango de columnas numéricas (alineadas a la dcha.).
const COL_ESTADO = CABECERAS.length - 1;
const NUM_DESDE = 2;
const NUM_HASTA = COL_ESTADO - 1;

// Colores (RGB sin #).
const HEADER_BG = '1E293B'; // slate-800
const HEADER_FG = 'FFFFFF';
const FILA_MAL = 'FEE2E2'; // red-100
const CELDA_MAL = 'FCA5A5'; // red-300
const BANDA = 'F1F5F9'; // slate-100 (filas alternas OK)
const BORDE = 'E2E8F0'; // slate-200

const borde = {
  top: { style: 'thin', color: { rgb: BORDE } },
  bottom: { style: 'thin', color: { rgb: BORDE } },
  left: { style: 'thin', color: { rgb: BORDE } },
  right: { style: 'thin', color: { rgb: BORDE } },
};

function celdaDiscrepa(l: LineaConciliada, col: number): boolean {
  // 2,3 = unidades · 4 = bonif · 5,6 = precio · 7,8 = descuento
  if (col === 2 || col === 3) return l.discrepancias.includes('unidades');
  if (col === 5 || col === 6) return l.discrepancias.includes('precio');
  if (col === 7 || col === 8) return l.discrepancias.includes('descuento');
  return false;
}

export function generarInforme(c: Conciliacion): Uint8Array {
  const resumen = c.todoCoincide ? 'TODO COINCIDE' : `${c.totalDiscrepancias} discrepancia(s)`;

  const aoa: unknown[][] = [
    [`Albarán: ${c.numeroAlbaran}`],
    [`Proveedor: ${c.proveedor}`],
    [`Resultado: ${resumen}`],
    [],
    [...CABECERAS],
    ...c.lineas.map((l) => [
      l.cn,
      l.descripcion,
      l.udsPedido ?? '',
      l.udsAlbaran ?? '',
      l.bonifAlbaran ? l.bonifAlbaran : '',
      l.precioPedido ?? '',
      l.precioAlbaran ?? '',
      l.dtoPedido ?? '',
      l.dtoAlbaran ?? '',
      estadoTexto(l),
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [
    { wch: 12 }, { wch: 42 }, { wch: 11 }, { wch: 11 }, { wch: 11 },
    { wch: 13 }, { wch: 13 }, { wch: 12 }, { wch: 12 }, { wch: 34 },
  ];

  const set = (r: number, col: number, estilo: Record<string, unknown>) => {
    const addr = XLSX.utils.encode_cell({ r, c: col });
    if (ws[addr]) ws[addr].s = estilo;
  };

  // Cabeceras del documento (filas 0-2).
  for (let r = 0; r <= 2; r++) set(r, 0, { font: { bold: true, sz: 12 } });

  const HEADER_ROW = 4;
  for (let col = 0; col < CABECERAS.length; col++) {
    set(HEADER_ROW, col, {
      font: { bold: true, color: { rgb: HEADER_FG } },
      fill: { patternType: 'solid', fgColor: { rgb: HEADER_BG } },
      alignment: { horizontal: col >= NUM_DESDE && col <= NUM_HASTA ? 'right' : 'left', vertical: 'center' },
      border: borde,
    });
  }

  c.lineas.forEach((l, i) => {
    const r = HEADER_ROW + 1 + i;
    const filaMal = l.estado !== 'OK';
    for (let col = 0; col < CABECERAS.length; col++) {
      const estilo: Record<string, unknown> = {
        border: borde,
        alignment: { horizontal: col >= NUM_DESDE && col <= NUM_HASTA ? 'right' : 'left', vertical: 'center' },
      };
      if (celdaDiscrepa(l, col)) {
        estilo.fill = { patternType: 'solid', fgColor: { rgb: CELDA_MAL } };
        estilo.font = { bold: true, color: { rgb: '7F1D1D' } };
      } else if (filaMal) {
        estilo.fill = { patternType: 'solid', fgColor: { rgb: FILA_MAL } };
      } else if (i % 2 === 1) {
        // Banding: filas OK alternas con un gris muy suave → aspecto de tabla.
        estilo.fill = { patternType: 'solid', fgColor: { rgb: BANDA } };
      }
      if (col === COL_ESTADO && filaMal) estilo.font = { bold: true, color: { rgb: '991B1B' } };
      set(r, col, estilo);
    }
  });

  // Filtros en la cabecera (dropdowns) → la hoja se comporta como tabla.
  const ultimaFila = HEADER_ROW + c.lineas.length;
  ws['!autofilter'] = {
    ref: `${XLSX.utils.encode_cell({ r: HEADER_ROW, c: 0 })}:${XLSX.utils.encode_cell({
      r: ultimaFila,
      c: CABECERAS.length - 1,
    })}`,
  };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Conciliación');

  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Uint8Array(buf);
}

/** Nombre del archivo de salida (§10). Sin nº de proveedor fiable → solo nombre. */
export function nombreInforme(c: Conciliacion, nProveedor?: string): string {
  const limpio = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '').trim() || 'albaran';
  const base = nProveedor ? `${nProveedor}_${c.proveedor}` : c.proveedor || c.numeroAlbaran;
  return `${limpio(base)}.xlsx`;
}
