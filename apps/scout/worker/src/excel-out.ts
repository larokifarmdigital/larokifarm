// Genera el Excel resultado con dos hojas: "Resumen" (una fila por producto) y
// "Detalle" (una fila por producto × farmacia). Devuelve ArrayBuffer para KV.

import * as XLSX from 'xlsx';
import type { ProductoRow } from './excel-in';
import type { ProductoComparado } from './scraper';

export interface ExcelResultado {
  buffer: ArrayBuffer;
  bytes: number;
}

export function generarExcelResultado(
  productos: Array<{ input: ProductoRow; resultado: ProductoComparado }>,
  fecha: Date,
): ExcelResultado {
  const fechaIso = fecha.toISOString().slice(0, 10);

  const resumenRows = productos.map(({ input, resultado }) => {
    const mejor = resultado.mejorFarmacia;
    return {
      CN: input.cn,
      EAN: input.ean,
      Nombre: input.nombre,
      'Precio mín (€)': resultado.resumen?.min ?? '',
      'Precio máx (€)': resultado.resumen?.max ?? '',
      'Precio medio (€)': resultado.resumen?.medio ?? '',
      'Nº farmacias': resultado.farmacias.length,
      'Mejor farmacia': mejor?.nombre ?? '',
      'URL mejor farmacia': mejor?.url ?? '',
      Notas: resultado.notas ?? '',
    };
  });

  interface DetalleRow {
    CN: string;
    'Nombre producto': string;
    Farmacia: string;
    'Precio (€)': number | string;
    'Título encontrado': string;
    URL: string;
    Fecha: string;
  }
  const detalleRows: DetalleRow[] = productos.flatMap(({ input, resultado }) =>
    resultado.farmacias.length > 0
      ? resultado.farmacias.map<DetalleRow>((f) => ({
          CN: input.cn,
          'Nombre producto': input.nombre,
          Farmacia: f.nombre,
          'Precio (€)': f.precio,
          'Título encontrado': f.tituloEncontrado,
          URL: f.url,
          Fecha: fechaIso,
        }))
      : [
          {
            CN: input.cn,
            'Nombre producto': input.nombre,
            Farmacia: '(sin resultados)',
            'Precio (€)': '',
            'Título encontrado': resultado.notas ?? 'No encontrado',
            URL: '',
            Fecha: fechaIso,
          },
        ],
  );

  const wb = XLSX.utils.book_new();

  const wsResumen = XLSX.utils.json_to_sheet(resumenRows);
  wsResumen['!cols'] = [
    { wch: 10 }, // CN
    { wch: 15 }, // EAN
    { wch: 45 }, // Nombre
    { wch: 12 }, // Precio mín
    { wch: 12 }, // Precio máx
    { wch: 14 }, // Precio medio
    { wch: 12 }, // Nº farmacias
    { wch: 22 }, // Mejor farmacia
    { wch: 50 }, // URL mejor
    { wch: 30 }, // Notas
  ];
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

  const wsDetalle = XLSX.utils.json_to_sheet(detalleRows);
  wsDetalle['!cols'] = [
    { wch: 10 }, // CN
    { wch: 45 }, // Nombre producto
    { wch: 22 }, // Farmacia
    { wch: 12 }, // Precio
    { wch: 45 }, // Título encontrado
    { wch: 60 }, // URL
    { wch: 12 }, // Fecha
  ];
  XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle');

  const arr = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
  return {
    buffer: arr.buffer as ArrayBuffer,
    bytes: arr.byteLength,
  };
}
