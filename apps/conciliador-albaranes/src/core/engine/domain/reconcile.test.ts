import { describe, expect, it } from 'vitest';
import { reconcile, statusText } from './reconcile';
import type { DeliveryNoteData, OrderData } from './types';

function order(lines: OrderData['lines']): OrderData {
  return { supplierName: 'DENTAID', lines };
}
function deliveryNote(lines: DeliveryNoteData['lines']): DeliveryNoteData {
  return { deliveryNoteNumber: 'A-1', supplier: 'DENTAID', lines };
}

describe('reconcile', () => {
  it('todo coincide → OK', () => {
    const r = reconcile(
      deliveryNote([{ nationalCode: '154054.6', description: 'Producto', quantity: 10, unitPrice: 2.45, discount: 21 }]),
      order([{ productCode: '154054', description: 'Producto', units: 10, price: 2.45, discount: 21 }]),
    );
    expect(r.allMatch).toBe(true);
    expect(r.totalDiscrepancies).toBe(0);
    expect(r.lines[0].status).toBe('OK');
  });

  it('detecta discrepancia de unidades, precio y descuento', () => {
    const r = reconcile(
      deliveryNote([{ nationalCode: '154054', description: 'P', quantity: 9, unitPrice: 2.5, discount: 20 }]),
      order([{ productCode: '154054', description: 'P', units: 10, price: 2.45, discount: 21 }]),
    );
    expect(r.allMatch).toBe(false);
    expect(r.lines[0].status).toBe('DISCREPANCY');
    expect(r.lines[0].discrepancies).toEqual(['units', 'price', 'discount']);
  });

  it('respeta las tolerancias (diferencias por debajo del umbral → OK)', () => {
    const r = reconcile(
      deliveryNote([{ nationalCode: '154054', description: 'P', quantity: 10, unitPrice: 2.455, discount: 21.005 }]),
      order([{ productCode: '154054', description: 'P', units: 10, price: 2.45, discount: 21 }]),
    );
    expect(r.lines[0].status).toBe('OK');
  });

  it('FALTA EN ALBARÁN: pedido pero no servido', () => {
    const r = reconcile(
      deliveryNote([]),
      order([{ productCode: '154054', description: 'P', units: 5, price: 1, discount: 0 }]),
    );
    expect(r.lines[0].status).toBe('MISSING_IN_DELIVERY_NOTE');
    expect(statusText(r.lines[0])).toBe('FALTA EN ALBARÁN');
  });

  it('SOBRA EN ALBARÁN: servido pero no pedido', () => {
    const r = reconcile(
      deliveryNote([{ nationalCode: '999999', description: 'Extra', quantity: 2, unitPrice: 3, discount: 0 }]),
      order([]),
    );
    expect(r.lines[0].status).toBe('EXTRA_IN_DELIVERY_NOTE');
    expect(statusText(r.lines[0])).toBe('SOBRA EN ALBARÁN (no pedido)');
  });

  it('cruza por C.N. normalizado (154054.6 ↔ 154054)', () => {
    const r = reconcile(
      deliveryNote([{ nationalCode: '154054.6', description: 'P', quantity: 10, unitPrice: 2.45, discount: 21 }]),
      order([{ productCode: '154054', description: 'P', units: 10, price: 2.45, discount: 21 }]),
    );
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].nationalCode).toBe('154054');
    expect(r.lines[0].status).toBe('OK');
  });

  it('ordena las filas con problema primero', () => {
    const r = reconcile(
      deliveryNote([
        { nationalCode: '111111', description: 'Ok', quantity: 1, unitPrice: 1, discount: 0 },
        { nationalCode: '222222', description: 'Mal', quantity: 5, unitPrice: 1, discount: 0 },
      ]),
      order([
        { productCode: '111111', description: 'Ok', units: 1, price: 1, discount: 0 },
        { productCode: '222222', description: 'Mal', units: 9, price: 1, discount: 0 },
      ]),
    );
    expect(r.lines[0].nationalCode).toBe('222222'); // la discrepante va primero
    expect(r.lines[0].status).toBe('DISCREPANCY');
  });

  it('cruza por código alternativo/EAN cuando el C.N. no casa', () => {
    const r = reconcile(
      deliveryNote([{ nationalCode: '', ean: '8470001540546', description: 'P', quantity: 10, unitPrice: 2.45, discount: 21 }]),
      order([{ productCode: '', alternativeCode: '8470001540546', description: 'P', units: 10, price: 2.45, discount: 21 }]),
    );
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].status).toBe('OK');
    expect(r.lines[0].nationalCode).toBe('8470001540546');
  });

  it('si el C.N. no coincide, el EAN sí los empareja (no marca SOBRA/FALTA)', () => {
    const r = reconcile(
      deliveryNote([{ nationalCode: '111111', ean: '8470001540546', description: 'P', quantity: 9, unitPrice: 2.45, discount: 21 }]),
      order([{ productCode: '222222', alternativeCode: '8470001540546', description: 'P', units: 10, price: 2.45, discount: 21 }]),
    );
    expect(r.lines).toHaveLength(1); // emparejados por EAN, no son 2 filas sueltas
    expect(r.lines[0].status).toBe('DISCREPANCY');
    expect(r.lines[0].discrepancies).toEqual(['units']);
  });

  it('prioriza el C.N. sobre el EAN', () => {
    const r = reconcile(
      deliveryNote([{ nationalCode: '154054', ean: '8470001540546', description: 'P', quantity: 10, unitPrice: 2.45, discount: 21 }]),
      order([{ productCode: '154054', alternativeCode: 'OTRO9999', description: 'P', units: 10, price: 2.45, discount: 21 }]),
    );
    expect(r.lines[0].status).toBe('OK');
    expect(r.lines[0].nationalCode).toBe('154054');
  });

  // Caso PEROXFARMA: la factura solo trae el código interno del proveedor
  // (ej. "UN14080"); ni C.N. ni EAN. El cruce con el pedido tiene que poder
  // hacerse por ese código interno (3er nivel del buscar).
  it('cruza por código interno del proveedor cuando no hay C.N. ni EAN', () => {
    const r = reconcile(
      deliveryNote([{ code: 'UN14080', description: 'ICO JERINGA INS. 1ML', quantity: 200, unitPrice: 37.18, discount: 40 }]),
      order([{ productCode: 'UN14080', description: 'ICO JERINGA INS. 1ML', units: 200, price: 37.18, discount: 40 }]),
    );
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].status).toBe('OK');
    expect(r.lines[0].unitsOrdered).toBe(200);
    expect(r.lines[0].unitsDelivered).toBe(200);
  });

  // Variante del caso PEROX: el código interno cruza incluso cuando
  // cleanNationalCode del pedido produciría una clave distinta (porque el
  // pedido mete productCode también por cn). Aquí solo hay match si la 3ª
  // clave (cod sin truncar) funciona.
  it('cruza por código interno aunque cn (truncado) no coincida', () => {
    const r = reconcile(
      // Albarán sin C.N. ni EAN, solo código interno
      deliveryNote([{ code: 'UN14080', description: 'JERINGA', quantity: 100, unitPrice: 22.31, discount: 40 }]),
      // Pedido con productCode idéntico
      order([{ productCode: 'UN14080', description: 'JERINGA', units: 100, price: 22.31, discount: 40 }]),
    );
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].status).toBe('OK');
    expect(r.lines[0].discrepancies).toEqual([]);
  });

  // Caso bug Marvis/Perrigo: 4 productos distintos cuyos códigos internos
  // empiezan igual ("5000036689", "5000036691"...). Sin la separación cn/cod,
  // cleanNationalCode truncaría a 6 dígitos ("500003") y group() colapsaría
  // los 4 en un solo item sumando las unidades. Cada uno debe quedar separado
  // y cruzarse por su EAN único contra el pedido.
  it('no colapsa productos distintos del mismo proveedor con códigos internos parecidos', () => {
    const r = reconcile(
      deliveryNote([
        { code: '5000036689', ean: '8004395111718', description: 'MARVIS BLANQUEADOR', quantity: 36, unitPrice: 5.79, discount: 5 },
        { code: '5000036691', ean: '8004395112425', description: 'MARVIS SENSITIVE', quantity: 24, unitPrice: 5.79, discount: 5 },
        { code: '5000036692', ean: '8004395111756', description: 'MARVIS JAZMIN', quantity: 12, unitPrice: 5.21, discount: 5 },
        { code: '5000036693', ean: '8004395111725', description: 'MARVIS MENTA ACUATICA', quantity: 24, unitPrice: 5.21, discount: 5 },
      ]),
      order([
        { productCode: '000371', alternativeCode: '8004395111718', description: 'MARVIS BLANQUEADOR', units: 36, price: 5.79, discount: 5 },
        { productCode: '000264', alternativeCode: '8004395112425', description: 'MARVIS SENSITIVE', units: 24, price: 5.79, discount: 5 },
        { productCode: '000589', alternativeCode: '8004395111756', description: 'MARVIS JAZMIN', units: 12, price: 5.21, discount: 5 },
        { productCode: '000263', alternativeCode: '8004395111725', description: 'MARVIS MENTA ACUATICA', units: 18, price: 5.21, discount: 5 },
      ]),
    );
    expect(r.lines).toHaveLength(4);
    const blanqueador = r.lines.find((l) => l.description.includes('BLANQUEADOR'));
    expect(blanqueador?.unitsDelivered).toBe(36); // no 96
    expect(blanqueador?.status).toBe('OK');
  });

  it('bonificación por columna BONIF.: UDS es el total, facturadas = UDS − BONIF', () => {
    const r = reconcile(
      // Caso real: UDS=8 (total) con BONIF=2 → 6 facturadas. dto 28 en la línea.
      deliveryNote([{ nationalCode: '161234', description: 'P', quantity: 8, unitPrice: 16.22, discount: 28, freeUnits: 2 }]),
      order([{ productCode: '161234', description: 'P', units: 6, price: 16.22, discount: 28 }]),
    );
    expect(r.lines[0].unitsDelivered).toBe(6); // 8 − 2
    expect(r.lines[0].freeUnitsDelivered).toBe(2);
    expect(r.lines[0].discountDelivered).toBe(28); // el dto se lee de la propia línea
    expect(r.lines[0].status).toBe('OK');
  });

  it('caso real: producto en 2 líneas (6 uds CON dto + 2 uds SIN dto) → dto de la facturada', () => {
    const r = reconcile(
      // La línea de 2 uds (regalo, dto 0) NO debe robar el descuento a la de 6 (dto 28).
      deliveryNote([
        // La línea de regalo trae 2 uds Y la columna BONIF=2 → no se debe contar doble.
        { nationalCode: '161234', description: 'AV ESPUMA', quantity: 2, unitPrice: 16.22, discount: 0, freeUnits: 2 },
        { nationalCode: '161234', description: 'AV ESPUMA', quantity: 6, unitPrice: 16.22, discount: 28 },
      ]),
      order([{ productCode: '161234', description: 'AV ESPUMA', units: 6, price: 16.22, discount: 28 }]),
    );
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].unitsDelivered).toBe(6);
    expect(r.lines[0].freeUnitsDelivered).toBe(2); // no 4
    expect(r.lines[0].discountDelivered).toBe(28); // <- de la línea facturada, no la de regalo
    expect(r.lines[0].status).toBe('OK');
  });

  it('bonificación como línea aparte (mismo producto con precio 0)', () => {
    const r = reconcile(
      deliveryNote([
        { nationalCode: '154054', description: 'P', quantity: 6, unitPrice: 2.45, discount: 21 },
        { nationalCode: '154054', description: 'P (regalo)', quantity: 2, unitPrice: 0, discount: 0 },
      ]),
      order([{ productCode: '154054', description: 'P', units: 6, price: 2.45, discount: 21 }]),
    );
    expect(r.lines).toHaveLength(1); // no se cuenta como SOBRA
    expect(r.lines[0].status).toBe('OK'); // 6 facturadas vs 6 pedidas
    expect(r.lines[0].unitsDelivered).toBe(6);
    expect(r.lines[0].freeUnitsDelivered).toBe(2);
  });

  it('precio y descuento del albarán salen de la línea facturada, no de la de regalo', () => {
    const r = reconcile(
      // El regalo (precio 0, dto 0) va PRIMERO; no debe robar precio/dto.
      deliveryNote([
        { nationalCode: '154054', description: 'P (regalo)', quantity: 2, unitPrice: 0, discount: 0 },
        { nationalCode: '154054', description: 'P', quantity: 6, unitPrice: 2.45, discount: 21 },
      ]),
      order([{ productCode: '154054', description: 'P', units: 6, price: 2.45, discount: 21 }]),
    );
    expect(r.lines[0].priceDelivered).toBe(2.45);
    expect(r.lines[0].discountDelivered).toBe(21); // <- no 0
    expect(r.lines[0].freeUnitsDelivered).toBe(2);
    expect(r.lines[0].status).toBe('OK');
  });

  it('una línea con precio 0 SIN duplicado facturado no se trata como regalo (no pierde sus datos)', () => {
    const r = reconcile(
      deliveryNote([{ nationalCode: '154054', description: 'P', quantity: 6, unitPrice: 0, discount: 21 }]),
      order([{ productCode: '154054', description: 'P', units: 6, price: 2.45, discount: 21 }]),
    );
    // Se conserva como facturada (6 uds), no como bonificación de 6.
    expect(r.lines[0].unitsDelivered).toBe(6);
    expect(r.lines[0].freeUnitsDelivered).toBe(0);
  });

  it('si faltan facturadas pero hay regalo, sí marca discrepancia de unidades', () => {
    const r = reconcile(
      deliveryNote([
        { nationalCode: '154054', description: 'P', quantity: 5, unitPrice: 2.45, discount: 21 },
        { nationalCode: '154054', description: 'P (regalo)', quantity: 2, unitPrice: 0, discount: 0 },
      ]),
      order([{ productCode: '154054', description: 'P', units: 6, price: 2.45, discount: 21 }]),
    );
    expect(r.lines[0].status).toBe('DISCREPANCY');
    expect(r.lines[0].discrepancies).toEqual(['units']); // 5 facturadas vs 6
    expect(r.lines[0].freeUnitsDelivered).toBe(2);
  });

  it('agrega unidades cuando un C.N. se repite', () => {
    const r = reconcile(
      deliveryNote([{ nationalCode: '154054', description: 'P', quantity: 10, unitPrice: 2.45, discount: 21 }]),
      order([
        { productCode: '154054', description: 'P', units: 6, price: 2.45, discount: 21 },
        { productCode: '154054', description: 'P', units: 4, price: 2.45, discount: 21 },
      ]),
    );
    expect(r.lines[0].unitsOrdered).toBe(10);
    expect(r.lines[0].status).toBe('OK');
  });
});
