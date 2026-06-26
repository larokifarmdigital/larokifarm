import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { conciliar } from './comparar';
import { generarInforme } from './generarInforme';
import { leerPedido } from './leerPedido';
import type { AlbaranData } from './tipos';

/** Construye un .xlsx en memoria con las columnas reales del pedido. */
function excelPedido(): Uint8Array {
  const ws = XLSX.utils.json_to_sheet([
    { CodigoArticulo: '154054', DescripcionArticulo: 'Producto A', UnidadesPedidas: 10, Precio: '2,45', '%Descuento': 21 },
    { CodigoArticulo: '369694', DescripcionArticulo: 'Producto B', UnidadesPedidas: 5, Precio: '1,00', '%Descuento': 0 },
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pedido');
  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer);
}

/** Excel con los encabezados REALES del cliente. */
function excelPedidoReal(): Uint8Array {
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
  it('leerPedido mapea columnas y parsea coma decimal', () => {
    const pedido = leerPedido(excelPedido());
    expect(pedido.lineas).toHaveLength(2);
    expect(pedido.lineas[0]).toMatchObject({
      codigoArticulo: '154054',
      unidades: 10,
      precio: 2.45,
      descuento: 21,
    });
  });

  it('leerPedido con los encabezados reales del cliente (Unidades, RazonSocial…)', () => {
    const pedido = leerPedido(excelPedidoReal());
    expect(pedido.lineas[0]).toMatchObject({
      codigoArticulo: '154054',
      unidades: 10, // <- la clave: lee "Unidades", no 0
      precio: 2.45,
      descuento: 21,
    });
    expect(pedido.nProveedor).toBe('1001');
    expect(pedido.nombreProveedor).toBe('KERN PHARMA S.L.');
  });

  it('flujo completo leer → conciliar → generar informe produce un .xlsx', () => {
    const pedido = leerPedido(excelPedido());
    const albaran: AlbaranData = {
      numero_albaran: 'A-1',
      proveedor: 'DENTAID',
      lineas: [
        { codigo_nacional: '154054.6', descripcion: 'Producto A', cantidad: 9, precio_unitario: 2.45, descuento: 21 },
        { codigo_nacional: '369694.4', descripcion: 'Producto B', cantidad: 5, precio_unitario: 1, descuento: 0 },
      ],
    };
    const conc = conciliar(albaran, pedido);
    expect(conc.todoCoincide).toBe(false); // 9 != 10 en el primero
    expect(conc.totalDiscrepancias).toBe(1);

    const bytes = generarInforme(conc);
    expect(bytes.byteLength).toBeGreaterThan(0);
    // Debe ser un .xlsx (zip) → empieza por "PK".
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });
});
