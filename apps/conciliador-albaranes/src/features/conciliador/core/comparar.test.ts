import { describe, expect, it } from 'vitest';
import { conciliar, estadoTexto } from './comparar';
import type { AlbaranData, PedidoData } from './tipos';

function pedido(lineas: PedidoData['lineas']): PedidoData {
  return { nombreProveedor: 'DENTAID', lineas };
}
function albaran(lineas: AlbaranData['lineas']): AlbaranData {
  return { numero_albaran: 'A-1', proveedor: 'DENTAID', lineas };
}

describe('conciliar', () => {
  it('todo coincide → OK', () => {
    const r = conciliar(
      albaran([{ codigo_nacional: '154054.6', descripcion: 'Producto', cantidad: 10, precio_unitario: 2.45, descuento: 21 }]),
      pedido([{ codigoArticulo: '154054', descripcion: 'Producto', unidades: 10, precio: 2.45, descuento: 21 }]),
    );
    expect(r.todoCoincide).toBe(true);
    expect(r.totalDiscrepancias).toBe(0);
    expect(r.lineas[0].estado).toBe('OK');
  });

  it('detecta discrepancia de unidades, precio y descuento', () => {
    const r = conciliar(
      albaran([{ codigo_nacional: '154054', descripcion: 'P', cantidad: 9, precio_unitario: 2.5, descuento: 20 }]),
      pedido([{ codigoArticulo: '154054', descripcion: 'P', unidades: 10, precio: 2.45, descuento: 21 }]),
    );
    expect(r.todoCoincide).toBe(false);
    expect(r.lineas[0].estado).toBe('DISCREPANCIA');
    expect(r.lineas[0].discrepancias).toEqual(['unidades', 'precio', 'descuento']);
  });

  it('respeta las tolerancias (diferencias por debajo del umbral → OK)', () => {
    const r = conciliar(
      albaran([{ codigo_nacional: '154054', descripcion: 'P', cantidad: 10, precio_unitario: 2.455, descuento: 21.005 }]),
      pedido([{ codigoArticulo: '154054', descripcion: 'P', unidades: 10, precio: 2.45, descuento: 21 }]),
    );
    expect(r.lineas[0].estado).toBe('OK');
  });

  it('FALTA EN ALBARÁN: pedido pero no servido', () => {
    const r = conciliar(
      albaran([]),
      pedido([{ codigoArticulo: '154054', descripcion: 'P', unidades: 5, precio: 1, descuento: 0 }]),
    );
    expect(r.lineas[0].estado).toBe('FALTA_EN_ALBARAN');
    expect(estadoTexto(r.lineas[0])).toBe('FALTA EN ALBARÁN');
  });

  it('SOBRA EN ALBARÁN: servido pero no pedido', () => {
    const r = conciliar(
      albaran([{ codigo_nacional: '999999', descripcion: 'Extra', cantidad: 2, precio_unitario: 3, descuento: 0 }]),
      pedido([]),
    );
    expect(r.lineas[0].estado).toBe('SOBRA_EN_ALBARAN');
    expect(estadoTexto(r.lineas[0])).toBe('SOBRA EN ALBARÁN (no pedido)');
  });

  it('cruza por C.N. normalizado (154054.6 ↔ 154054)', () => {
    const r = conciliar(
      albaran([{ codigo_nacional: '154054.6', descripcion: 'P', cantidad: 10, precio_unitario: 2.45, descuento: 21 }]),
      pedido([{ codigoArticulo: '154054', descripcion: 'P', unidades: 10, precio: 2.45, descuento: 21 }]),
    );
    expect(r.lineas).toHaveLength(1);
    expect(r.lineas[0].cn).toBe('154054');
    expect(r.lineas[0].estado).toBe('OK');
  });

  it('ordena las filas con problema primero', () => {
    const r = conciliar(
      albaran([
        { codigo_nacional: '111111', descripcion: 'Ok', cantidad: 1, precio_unitario: 1, descuento: 0 },
        { codigo_nacional: '222222', descripcion: 'Mal', cantidad: 5, precio_unitario: 1, descuento: 0 },
      ]),
      pedido([
        { codigoArticulo: '111111', descripcion: 'Ok', unidades: 1, precio: 1, descuento: 0 },
        { codigoArticulo: '222222', descripcion: 'Mal', unidades: 9, precio: 1, descuento: 0 },
      ]),
    );
    expect(r.lineas[0].cn).toBe('222222'); // la discrepante va primero
    expect(r.lineas[0].estado).toBe('DISCREPANCIA');
  });

  it('agrega unidades cuando un C.N. se repite', () => {
    const r = conciliar(
      albaran([{ codigo_nacional: '154054', descripcion: 'P', cantidad: 10, precio_unitario: 2.45, descuento: 21 }]),
      pedido([
        { codigoArticulo: '154054', descripcion: 'P', unidades: 6, precio: 2.45, descuento: 21 },
        { codigoArticulo: '154054', descripcion: 'P', unidades: 4, precio: 2.45, descuento: 21 },
      ]),
    );
    expect(r.lineas[0].udsPedido).toBe(10);
    expect(r.lineas[0].estado).toBe('OK');
  });
});
