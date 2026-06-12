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

  it('cruza por código alternativo/EAN cuando el C.N. no casa', () => {
    const r = conciliar(
      albaran([{ codigo_nacional: '', codigo_ean: '8470001540546', descripcion: 'P', cantidad: 10, precio_unitario: 2.45, descuento: 21 }]),
      pedido([{ codigoArticulo: '', codigoAlternativo: '8470001540546', descripcion: 'P', unidades: 10, precio: 2.45, descuento: 21 }]),
    );
    expect(r.lineas).toHaveLength(1);
    expect(r.lineas[0].estado).toBe('OK');
    expect(r.lineas[0].cn).toBe('8470001540546');
  });

  it('si el C.N. no coincide, el EAN sí los empareja (no marca SOBRA/FALTA)', () => {
    const r = conciliar(
      albaran([{ codigo_nacional: '111111', codigo_ean: '8470001540546', descripcion: 'P', cantidad: 9, precio_unitario: 2.45, descuento: 21 }]),
      pedido([{ codigoArticulo: '222222', codigoAlternativo: '8470001540546', descripcion: 'P', unidades: 10, precio: 2.45, descuento: 21 }]),
    );
    expect(r.lineas).toHaveLength(1); // emparejados por EAN, no son 2 filas sueltas
    expect(r.lineas[0].estado).toBe('DISCREPANCIA');
    expect(r.lineas[0].discrepancias).toEqual(['unidades']);
  });

  it('prioriza el C.N. sobre el EAN', () => {
    const r = conciliar(
      albaran([{ codigo_nacional: '154054', codigo_ean: '8470001540546', descripcion: 'P', cantidad: 10, precio_unitario: 2.45, descuento: 21 }]),
      pedido([{ codigoArticulo: '154054', codigoAlternativo: 'OTRO9999', descripcion: 'P', unidades: 10, precio: 2.45, descuento: 21 }]),
    );
    expect(r.lineas[0].estado).toBe('OK');
    expect(r.lineas[0].cn).toBe('154054');
  });

  it('bonificación por columna BONIF.: UDS es el total, facturadas = UDS − BONIF', () => {
    const r = conciliar(
      // Caso real: UDS=8 (total) con BONIF=2 → 6 facturadas. dto 28 en la línea.
      albaran([{ codigo_nacional: '161234', descripcion: 'P', cantidad: 8, precio_unitario: 16.22, descuento: 28, bonificacion: 2 }]),
      pedido([{ codigoArticulo: '161234', descripcion: 'P', unidades: 6, precio: 16.22, descuento: 28 }]),
    );
    expect(r.lineas[0].udsAlbaran).toBe(6); // 8 − 2
    expect(r.lineas[0].bonifAlbaran).toBe(2);
    expect(r.lineas[0].dtoAlbaran).toBe(28); // el dto se lee de la propia línea
    expect(r.lineas[0].estado).toBe('OK');
  });

  it('caso real: producto en 2 líneas (6 uds CON dto + 2 uds SIN dto) → dto de la facturada', () => {
    const r = conciliar(
      // La línea de 2 uds (regalo, dto 0) NO debe robar el descuento a la de 6 (dto 28).
      albaran([
        // La línea de regalo trae 2 uds Y la columna BONIF=2 → no se debe contar doble.
        { codigo_nacional: '161234', descripcion: 'AV ESPUMA', cantidad: 2, precio_unitario: 16.22, descuento: 0, bonificacion: 2 },
        { codigo_nacional: '161234', descripcion: 'AV ESPUMA', cantidad: 6, precio_unitario: 16.22, descuento: 28 },
      ]),
      pedido([{ codigoArticulo: '161234', descripcion: 'AV ESPUMA', unidades: 6, precio: 16.22, descuento: 28 }]),
    );
    expect(r.lineas).toHaveLength(1);
    expect(r.lineas[0].udsAlbaran).toBe(6);
    expect(r.lineas[0].bonifAlbaran).toBe(2); // no 4
    expect(r.lineas[0].dtoAlbaran).toBe(28); // <- de la línea facturada, no la de regalo
    expect(r.lineas[0].estado).toBe('OK');
  });

  it('bonificación como línea aparte (mismo producto con precio 0)', () => {
    const r = conciliar(
      albaran([
        { codigo_nacional: '154054', descripcion: 'P', cantidad: 6, precio_unitario: 2.45, descuento: 21 },
        { codigo_nacional: '154054', descripcion: 'P (regalo)', cantidad: 2, precio_unitario: 0, descuento: 0 },
      ]),
      pedido([{ codigoArticulo: '154054', descripcion: 'P', unidades: 6, precio: 2.45, descuento: 21 }]),
    );
    expect(r.lineas).toHaveLength(1); // no se cuenta como SOBRA
    expect(r.lineas[0].estado).toBe('OK'); // 6 facturadas vs 6 pedidas
    expect(r.lineas[0].udsAlbaran).toBe(6);
    expect(r.lineas[0].bonifAlbaran).toBe(2);
  });

  it('precio y descuento del albarán salen de la línea facturada, no de la de regalo', () => {
    const r = conciliar(
      // El regalo (precio 0, dto 0) va PRIMERO; no debe robar precio/dto.
      albaran([
        { codigo_nacional: '154054', descripcion: 'P (regalo)', cantidad: 2, precio_unitario: 0, descuento: 0 },
        { codigo_nacional: '154054', descripcion: 'P', cantidad: 6, precio_unitario: 2.45, descuento: 21 },
      ]),
      pedido([{ codigoArticulo: '154054', descripcion: 'P', unidades: 6, precio: 2.45, descuento: 21 }]),
    );
    expect(r.lineas[0].precioAlbaran).toBe(2.45);
    expect(r.lineas[0].dtoAlbaran).toBe(21); // <- no 0
    expect(r.lineas[0].bonifAlbaran).toBe(2);
    expect(r.lineas[0].estado).toBe('OK');
  });

  it('una línea con precio 0 SIN duplicado facturado no se trata como regalo (no pierde sus datos)', () => {
    const r = conciliar(
      albaran([{ codigo_nacional: '154054', descripcion: 'P', cantidad: 6, precio_unitario: 0, descuento: 21 }]),
      pedido([{ codigoArticulo: '154054', descripcion: 'P', unidades: 6, precio: 2.45, descuento: 21 }]),
    );
    // Se conserva como facturada (6 uds), no como bonificación de 6.
    expect(r.lineas[0].udsAlbaran).toBe(6);
    expect(r.lineas[0].bonifAlbaran).toBe(0);
  });

  it('si faltan facturadas pero hay regalo, sí marca discrepancia de unidades', () => {
    const r = conciliar(
      albaran([
        { codigo_nacional: '154054', descripcion: 'P', cantidad: 5, precio_unitario: 2.45, descuento: 21 },
        { codigo_nacional: '154054', descripcion: 'P (regalo)', cantidad: 2, precio_unitario: 0, descuento: 0 },
      ]),
      pedido([{ codigoArticulo: '154054', descripcion: 'P', unidades: 6, precio: 2.45, descuento: 21 }]),
    );
    expect(r.lineas[0].estado).toBe('DISCREPANCIA');
    expect(r.lineas[0].discrepancias).toEqual(['unidades']); // 5 facturadas vs 6
    expect(r.lineas[0].bonifAlbaran).toBe(2);
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
