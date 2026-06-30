import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { reconcile } from './reconcile';
import { generateReport } from './generateReport';
import { readOrder } from './readOrder';
import type { DeliveryNoteData } from './types';

/** Builds an in-memory .xlsx with the real order columns. */
function orderExcel(): Uint8Array {
  const ws = XLSX.utils.json_to_sheet([
    { CodigoArticulo: '154054', DescripcionArticulo: 'Producto A', UnidadesPedidas: 10, Precio: '2,45', '%Descuento': 21 },
    { CodigoArticulo: '369694', DescripcionArticulo: 'Producto B', UnidadesPedidas: 5, Precio: '1,00', '%Descuento': 0 },
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pedido');
  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer);
}

/** Excel with the client's REAL headers. */
function realOrderExcel(): Uint8Array {
  const ws = XLSX.utils.json_to_sheet([
    {
      CodigoProveedor: '1001',
      RazonSocial: 'KERN PHARMA S.L.',
      CodigoArticulo: '154054',
      CodigoAlternativo: 'X',
      Unidades: 10,
      Precio: '2,45',
      '%Descuento': 21,
      ImporteNeto: 0,
      ImporteLiquido: 0,
      DescripcionArticulo: 'Producto A',
      Estado: 'OK',
    },
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pedido');
  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer);
}

describe('adaptadores Excel (SheetJS en este runtime)', () => {
  it('readOrder mapea columnas y parsea coma decimal', () => {
    const order = readOrder(orderExcel());
    expect(order.lines).toHaveLength(2);
    expect(order.lines[0]).toMatchObject({
      productCode: '154054',
      units: 10,
      price: 2.45,
      discount: 21,
    });
  });

  it('readOrder con los encabezados reales del cliente (Unidades, RazonSocial…)', () => {
    const order = readOrder(realOrderExcel());
    expect(order.lines[0]).toMatchObject({
      productCode: '154054',
      units: 10, // <- la clave: lee "Unidades", no 0
      price: 2.45,
      discount: 21,
    });
    expect(order.supplierNumber).toBe('1001');
    expect(order.supplierName).toBe('KERN PHARMA S.L.');
  });

  it('flujo completo leer → reconciliar → generar informe produce un .xlsx', () => {
    const order = readOrder(orderExcel());
    const deliveryNote: DeliveryNoteData = {
      deliveryNoteNumber: 'A-1',
      supplier: 'DENTAID',
      lines: [
        { nationalCode: '154054.6', description: 'Producto A', quantity: 9, unitPrice: 2.45, discount: 21 },
        { nationalCode: '369694.4', description: 'Producto B', quantity: 5, unitPrice: 1, discount: 0 },
      ],
    };
    const conc = reconcile(deliveryNote, order);
    expect(conc.allMatch).toBe(false); // 9 != 10 en el primero
    expect(conc.totalDiscrepancies).toBe(1);

    const bytes = generateReport(conc);
    expect(bytes.byteLength).toBeGreaterThan(0);
    // Debe ser un .xlsx (zip) → empieza por "PK".
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });
});
