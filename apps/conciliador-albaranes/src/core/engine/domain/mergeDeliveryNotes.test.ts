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
    expect(mergeDeliveryNotes([a])).toStrictEqual(a);
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
  // albarán → todas en un mismo grupo (transitividad por union-find). Como
  // el kind con más filas es la factura (2), preservamos las 2 líneas de la
  // factura; sino perderíamos unidades cuando el mismo CN venga desglosado
  // por lote.
  it('union-find transitivo: A↔B por EAN, B↔C por código interno → 2 líneas (base = factura)', () => {
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
    expect(r.lines).toHaveLength(2);
    // ambos EAN/code se propagan desde el albarán al que falte
    expect(r.lines.every((l) => l.ean === '1111' || l.code === 'XCOD')).toBe(true);
  });

  // Caso ARCID STICKS: la factura desglosa el mismo CN por lote (3 + 72 UN,
  // sin descuento, ambos precio normal → NO son bonificación). El albarán
  // trae la misma cantidad total en una sola línea. Antes se colapsaba a una
  // única línea y se perdían las 3 UN del segundo lote.
  it('factura con mismo CN en dos lotes → se preservan las dos líneas para no perder unidades', () => {
    const deliveryNote: DeliveryNoteData = {
      deliveryNoteNumber: 'A1',
      documentKind: 'deliveryNote',
      lines: [
        line({ nationalCode: '2049949', description: 'ARCID STICKS', quantity: 75, unitPrice: 0 }),
      ],
    };
    const invoice: DeliveryNoteData = {
      deliveryNoteNumber: 'F1',
      documentKind: 'invoice',
      lines: [
        line({ nationalCode: '2049949', description: 'ARCID STICKS', quantity: 3, unitPrice: 7.37, discount: 0 }),
        line({ nationalCode: '2049949', description: 'ARCID STICKS', quantity: 72, unitPrice: 7.37, discount: 0 }),
      ],
    };
    const r = mergeDeliveryNotes([deliveryNote, invoice]);
    expect(r.lines).toHaveLength(2);
    const cantidades = r.lines.map((l) => l.quantity).sort((a, b) => a - b);
    expect(cantidades).toEqual([3, 72]);
    // ambas conservan precio/descuento de la factura
    expect(r.lines.every((l) => l.unitPrice === 7.37 && l.discount === 0)).toBe(true);
  });

  // Caso Zambon: pedido-PDF sin códigos y factura con código interno. Se
  // vinculan por descripción (fuzzy) como red de seguridad.
  it('Zambon: pedido sin CN/EAN/code cruza con factura por descripcion', () => {
    const pedido: DeliveryNoteData = {
      deliveryNoteNumber: 'O-402234',
      documentKind: 'other',
      lines: [
        line({ description: 'ULTRA-LEVURA 250MG 20 CAPS', quantity: 20, unitPrice: 9.77, discount: 20 }),
        line({ description: 'ESPIDIFEN 600MG 40 SOB MENTA EFG', quantity: 48, unitPrice: 5.10, discount: 7 }),
      ],
    };
    const factura: DeliveryNoteData = {
      deliveryNoteNumber: '1026027419',
      documentKind: 'invoice',
      lines: [
        line({ code: '7101772', description: 'ULTRA-LEVURA 250MG 20CPS -BL-', quantity: 20, unitPrice: 9.77 }),
        line({ code: '6794272', description: 'ESPIDIFEN 600MG MENTA EFG 40SOB', quantity: 48, unitPrice: 5.10 }),
      ],
    };
    const r = mergeDeliveryNotes([pedido, factura]);
    expect(r.lines).toHaveLength(2);
    // Cada línea fusionada mantiene el código de la factura y aporta el descuento del pedido.
    const ultra = r.lines.find((l) => l.code === '7101772')!;
    expect(ultra.discount).toBe(20);
    expect(ultra.quantity).toBe(20);
    const espidifen = r.lines.find((l) => l.code === '6794272')!;
    expect(espidifen.discount).toBe(7);
  });

  it('NO cruza dos SKUs con codigos distintos aunque la descripcion se parezca', () => {
    const dn: DeliveryNoteData = {
      deliveryNoteNumber: 'A',
      documentKind: 'deliveryNote',
      lines: [
        line({ code: 'X100', description: 'ULTRA-LEVURA 250MG 20 CAPS', quantity: 20, unitPrice: 10 }),
      ],
    };
    const inv: DeliveryNoteData = {
      deliveryNoteNumber: 'B',
      documentKind: 'invoice',
      lines: [
        line({ code: 'X200', description: 'ULTRA-LEVURA 250MG 20CPS -BL-', quantity: 20, unitPrice: 10 }),
      ],
    };
    // Aunque las descripciones matchean, ambos tienen code distinto → NO se cruzan.
    const r = mergeDeliveryNotes([dn, inv]);
    expect(r.lines).toHaveLength(2);
  });

  // Prioridad de descuento: cualquier valor no-cero > 0 explícito. Antes se
  // respetaba el 0 de la factura, pero eso se comía descuentos reales cuando
  // la factura totalizaba el descuento al pie (Zambon-style) y Gemini emitía
  // 0 por línea. Ahora un 5 % del albarán gana al 0 de la factura — si la
  // factura realmente cobra 0 % y el pedido/albarán decía 5, la discrepancia
  // saldrá al comparar el merge contra el pedido de Excel.
  it('descuento no-cero de cualquier fuente gana al 0 (evita perder 5% en Zambon-style)', () => {
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
    expect(r.lines[0].discount).toBe(5);
  });

  it('Zambon: pedido con dto 20% + factura sin dto por linea → merged discount=20', () => {
    const pedido: DeliveryNoteData = {
      deliveryNoteNumber: 'O-402234',
      documentKind: 'other',
      lines: [line({ description: 'ULTRA-LEVURA 250MG 20 CAPS', quantity: 20, unitPrice: 9.77, discount: 20 })],
    };
    const factura: DeliveryNoteData = {
      deliveryNoteNumber: '1026027419',
      documentKind: 'invoice',
      lines: [line({ code: '7101772', description: 'ULTRA-LEVURA 250MG 20CPS -BL-', quantity: 20, unitPrice: 9.77, discount: 0 })],
    };
    const r = mergeDeliveryNotes([pedido, factura]);
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].discount).toBe(20); // recuperado del pedido, no el 0 de la factura
    expect(r.lines[0].code).toBe('7101772'); // codigo de la factura persiste
  });

  it('si todas las fuentes tienen dto 0, el merged mantiene 0 (no se inventa nada)', () => {
    const a: DeliveryNoteData = {
      deliveryNoteNumber: 'A',
      documentKind: 'deliveryNote',
      lines: [line({ ean: '1111', quantity: 10, unitPrice: 10, discount: 0 })],
    };
    const b: DeliveryNoteData = {
      deliveryNoteNumber: 'B',
      documentKind: 'invoice',
      lines: [line({ ean: '1111', quantity: 10, unitPrice: 10, discount: 0 })],
    };
    const r = mergeDeliveryNotes([a, b]);
    expect(r.lines[0].discount).toBe(0);
  });
});
