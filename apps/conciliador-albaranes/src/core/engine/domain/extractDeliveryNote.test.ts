import { describe, expect, it } from 'vitest';
import { reconstructMissingDiscounts } from './extractDeliveryNote';
import type { DeliveryNoteData, DeliveryNoteLine } from './types';

function build(lines: Partial<DeliveryNoteLine>[]): DeliveryNoteData {
  return {
    deliveryNoteNumber: 'X',
    lines: lines.map((l) => ({
      description: '',
      quantity: 0,
      unitPrice: 0,
      ...l,
    })),
  };
}

describe('reconstructMissingDiscounts', () => {
  it('reconstruye el % cuando Gemini se lo comio pero dio el importe (caso REGALIZ)', () => {
    const r = reconstructMissingDiscounts(
      build([
        {
          nationalCode: '173405',
          description: 'RICOLA CARAM.S/AZ 50g REGALIZ',
          quantity: 40,
          unitPrice: 1.9,
          discount: 0,
          discountAmount: 7.6,
        },
      ]),
    );
    // 7.60 / (40 * 1.90) * 100 = 10
    expect(r.lines[0].discount).toBe(10);
  });

  it('no toca lineas donde el % ya viene bien', () => {
    const r = reconstructMissingDiscounts(
      build([
        {
          nationalCode: '204994',
          description: 'ARCID',
          quantity: 3,
          unitPrice: 7.37,
          discount: 30,
          discountAmount: 6.63,
        },
      ]),
    );
    expect(r.lines[0].discount).toBe(30);
  });

  it('no reconstruye cuando faltan datos (subtotal 0)', () => {
    const r = reconstructMissingDiscounts(
      build([
        {
          description: 'X',
          quantity: 0,
          unitPrice: 0,
          discount: 0,
          discountAmount: 5,
        },
      ]),
    );
    expect(r.lines[0].discount).toBe(0);
  });

  it('no reconstruye si el amount es 0 o negativo', () => {
    const r = reconstructMissingDiscounts(
      build([
        {
          description: 'X',
          quantity: 10,
          unitPrice: 2,
          discount: 0,
          discountAmount: 0,
        },
      ]),
    );
    expect(r.lines[0].discount).toBe(0);
  });

  it('descarta reconstrucciones absurdas (> 100 %)', () => {
    const r = reconstructMissingDiscounts(
      build([
        {
          description: 'X',
          quantity: 1,
          unitPrice: 1,
          discount: 0,
          discountAmount: 999, // ni de coña puede ser el descuento real
        },
      ]),
    );
    expect(r.lines[0].discount).toBe(0);
  });

  it('redondea a 2 decimales', () => {
    const r = reconstructMissingDiscounts(
      build([
        {
          description: 'X',
          quantity: 7,
          unitPrice: 3.33,
          discount: 0,
          discountAmount: 5.0, // 5 / 23.31 * 100 = 21.4499...
        },
      ]),
    );
    expect(r.lines[0].discount).toBe(21.45);
  });
});
