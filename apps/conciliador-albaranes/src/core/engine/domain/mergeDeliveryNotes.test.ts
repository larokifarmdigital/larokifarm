import { describe, expect, it } from 'vitest';
import { mergeDeliveryNotes } from './mergeDeliveryNotes';
import type { DeliveryNoteData, DeliveryNoteLine } from './types';

function line(p: Partial<DeliveryNoteLine>): DeliveryNoteLine {
  return {
    description: '',
    quantity: 0,
    unitPrice: 0,
    ...p,
  };
}

describe('mergeDeliveryNotes', () => {
  it('lista vacía → DeliveryNoteData vacío', () => {
    const r = mergeDeliveryNotes([]);
    expect(r.lines).toEqual([]);
    expect(r.deliveryNoteNumber).toBe('');
  });

  it('un solo PDF → devuelve el mismo sin cambios', () => {
    const a: DeliveryNoteData = {
      deliveryNoteNumber: 'A1',
      documentKind: 'deliveryNote',
      lines: [line({ ean: '1111', description: 'P', quantity: 1, unitPrice: 1 })],
    };
    expect(mergeDeliveryNotes([a])).toBe(a);
  });

  // Caso NESTLE: albarán y factura comparten el mismo set de productos, con
  // EAN y código interno en ambos. El albarán manda en cantidad; la factura
  // manda en precio y descuento.
  it('NESTLE: albarán (cantidad) + factura (precio/descuento) → fusión completa', () => {
    const deliveryNote: DeliveryNoteData = {
      deliveryNoteNumber: '8116029044',
      documentKind: 'deliveryNote',
      lines: [
        line({
          code: '12578223',
          ean: '7613032875305',
          description: 'NAN OPTIPRO 2',
          quantity: 6,
          unitPrice: 0,
        }),
        line({
          code: '12568654',
          ean: '7613035854444',
          description: 'NAN SUPREMEPRO 1',
          quantity: 18,
          unitPrice: 0,
        }),
      ],
    };
    const invoice: DeliveryNoteData = {
      deliveryNoteNumber: '8116029044',
      documentKind: 'invoice',
      lines: [
        line({
          code: '12578223',
          ean: '7613032875305',
          nationalCode: '156495.5',
          description: 'NAN OPTIPRO 2 800g',
          quantity: 6,
          unitPrice: 23.34,
          discount: 21.5, // 20 + 1.5 sumados por Gemini
        }),
        line({
          code: '12568654',
          ean: '7613035854444',
          nationalCode: '183880.3',
          description: 'NAN SUPREMEpro 1 800g',
          quantity: 18,
          unitPrice: 39.54,
          discount: 21.5,
        }),
      ],
    };

    const r = mergeDeliveryNotes([deliveryNote, invoice]);
    expect(r.lines).toHaveLength(2);

    const optipro = r.lines.find((l) => l.code === '12578223')!;
    expect(optipro.quantity).toBe(6);
    expect(optipro.unitPrice).toBe(23.34); // ← factura
    expect(optipro.discount).toBe(21.5); // ← factura
    expect(optipro.ean).toBe('7613032875305'); // ← albarán
    expect(optipro.nationalCode).toBe('156495.5'); // ← factura

    const supremepro = r.lines.find((l) => l.code === '12568654')!;
    expect(supremepro.quantity).toBe(18);
    expect(supremepro.unitPrice).toBe(39.54);
  });

  // Caso PEROX: la factura SOLO trae código interno. Sin union-find por todos
  // los identificadores, no habría cómo cruzar las líneas. Si la fusión
  // funciona, la línea de la factura aporta tarifa y descuento; la del
  // albarán aporta cantidad, EAN y C.N.
  it('PEROX: cruce por solo código interno cuando la factura no trae EAN/CN', () => {
    const deliveryNote: DeliveryNoteData = {
      deliveryNoteNumber: 'ALU-523836',
      documentKind: 'deliveryNote',
      lines: [
        line({
          code: 'UN14080',
          ean: '8431456140804',
          nationalCode: '164624.8',
          description: 'ICO JERINGA INS. 1ML',
          quantity: 200,
          unitPrice: 22.31, // neto, lo que Gemini ve en la columna Precio
        }),
        line({
          code: '102032003',
          ean: '8430442000191',
          nationalCode: '172981.1',
          description: 'MUSSVITAL ESSEN QUITAESMALTE 150ML',
          quantity: 12,
          unitPrice: 2.05,
        }),
      ],
    };
    const invoice: DeliveryNoteData = {
      deliveryNoteNumber: 'FA-487169',
      documentKind: 'invoice',
      lines: [
        line({
          code: 'UN14080',
          // sin EAN, sin C.N. — el caso difícil
          description: 'ICO JERINGA INS. 1ML + AGUJA 25G 0,5X16',
          quantity: 200,
          unitPrice: 37.18, // tarifa general
          discount: 40,
        }),
        line({
          code: '102032003',
          description: 'MUSSVITAL ESSEN QUITAESMALTE 150ML',
          quantity: 12,
          unitPrice: 3.42,
          discount: 40,
        }),
      ],
    };

    const r = mergeDeliveryNotes([deliveryNote, invoice]);
    expect(r.lines).toHaveLength(2);

    const jeringa = r.lines.find((l) => l.code === 'UN14080')!;
    expect(jeringa.quantity).toBe(200);
    expect(jeringa.unitPrice).toBe(37.18); // ← factura (tarifa, no neto)
    expect(jeringa.discount).toBe(40); // ← factura
    expect(jeringa.ean).toBe('8431456140804'); // ← albarán
    expect(jeringa.nationalCode).toBe('164624.8'); // ← albarán (factura no lo trae)

    const mussvital = r.lines.find((l) => l.code === '102032003')!;
    expect(mussvital.unitPrice).toBe(3.42);
    expect(mussvital.discount).toBe(40);
    expect(mussvital.quantity).toBe(12);
  });

  // El albarán y la factura pueden tener identificadores distintos rellenos
  // por línea: si una trae solo EAN y la otra trae solo C.N. del mismo
  // producto, NO se cruzan. Es una limitación aceptada para v1 — en la
  // práctica al menos un identificador suele coincidir.
  it('NO se cruzan líneas que no comparten ningún identificador', () => {
    const a: DeliveryNoteData = {
      deliveryNoteNumber: 'A1',
      documentKind: 'deliveryNote',
      lines: [line({ ean: '1111', description: 'P', quantity: 5, unitPrice: 1 })],
    };
    const b: DeliveryNoteData = {
      deliveryNoteNumber: 'A1',
      documentKind: 'invoice',
      lines: [line({ nationalCode: '222222', description: 'P', quantity: 5, unitPrice: 1 })],
    };
    const r = mergeDeliveryNotes([a, b]);
    expect(r.lines).toHaveLength(2); // dos líneas separadas
  });

  // Una línea del albarán que comparte EAN con una de la factura, y otra
  // línea de la factura que comparte código interno con la primera del
  // albarán → todas en un mismo grupo (transitividad por union-find).
  it('union-find transitivo: A↔B por EAN, B↔C por código interno → todo un grupo', () => {
    const a: DeliveryNoteData = {
      deliveryNoteNumber: 'A1',
      documentKind: 'deliveryNote',
      lines: [
        line({ code: 'XCOD', ean: '1111', description: 'P', quantity: 10, unitPrice: 0 }),
      ],
    };
    const b: DeliveryNoteData = {
      deliveryNoteNumber: 'A1',
      documentKind: 'invoice',
      lines: [
        line({ ean: '1111', description: 'P', quantity: 10, unitPrice: 5, discount: 10 }),
        line({ code: 'XCOD', description: 'P', quantity: 10, unitPrice: 6, discount: 15 }),
      ],
    };
    const r = mergeDeliveryNotes([a, b]);
    // 3 líneas de entrada, todas unidas por EAN o código → 1 línea fusionada
    expect(r.lines).toHaveLength(1);
  });

  // Si solo hay descuentos en la factura, el campo debe llegar al fusionado.
  // Validamos también que descuento 0 explícito de la factura se respeta.
  it('descuento 0 explícito de la factura se respeta (no se busca en el albarán)', () => {
    const deliveryNote: DeliveryNoteData = {
      deliveryNoteNumber: 'A1',
      documentKind: 'deliveryNote',
      lines: [line({ ean: '1111', quantity: 10, unitPrice: 0, discount: 5 })],
    };
    const invoice: DeliveryNoteData = {
      deliveryNoteNumber: 'A1',
      documentKind: 'invoice',
      lines: [line({ ean: '1111', quantity: 10, unitPrice: 10, discount: 0 })],
    };
    const r = mergeDeliveryNotes([deliveryNote, invoice]);
    expect(r.lines[0].discount).toBe(0); // factura manda, aunque sea 0
  });
});
