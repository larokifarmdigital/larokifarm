import { describe, expect, it } from 'vitest';
import { absorbOrphanDiscountLines } from './absorbOrphanDiscountLines';
import type { DeliveryNoteData } from './types';

function build(lines: DeliveryNoteData['lines']): DeliveryNoteData {
  return { deliveryNoteNumber: 'A-1', supplier: 'FAES', lines };
}

describe('absorbOrphanDiscountLines', () => {
  it('absorbe una línea huérfana de descuento en el artículo anterior', () => {
    const out = absorbOrphanDiscountLines(
      build([
        {
          nationalCode: '2085848',
          description: 'CANNAFAES FORTE CREMA 60ML',
          quantity: 25,
          unitPrice: 12.02,
        },
        {
          description: '',
          quantity: 0,
          unitPrice: 0,
          discount: 30,
        },
        {
          nationalCode: '2130555',
          description: 'RICOLA CARAM.50g MIEL Y HIERBAS',
          quantity: 40,
          unitPrice: 1.9,
          discount: 10,
        },
      ]),
    );
    expect(out.lines).toHaveLength(2);
    expect(out.lines[0].nationalCode).toBe('2085848');
    expect(out.lines[0].discount).toBe(30);
    expect(out.lines[1].nationalCode).toBe('2130555');
    expect(out.lines[1].discount).toBe(10);
  });

  it('suma descuentos compuestos si el anterior ya tenía uno', () => {
    const out = absorbOrphanDiscountLines(
      build([
        { nationalCode: '111111', description: 'X', quantity: 1, unitPrice: 10, discount: 20 },
        { description: '', quantity: 0, unitPrice: 0, discount: 1.5 },
      ]),
    );
    expect(out.lines).toHaveLength(1);
    expect(out.lines[0].discount).toBe(21.5);
  });

  it('no absorbe una línea que tiene código y precio (línea real)', () => {
    const out = absorbOrphanDiscountLines(
      build([
        { nationalCode: '111111', description: 'X', quantity: 1, unitPrice: 10 },
        { nationalCode: '222222', description: 'Y', quantity: 2, unitPrice: 5, discount: 30 },
      ]),
    );
    expect(out.lines).toHaveLength(2);
    expect(out.lines[1].discount).toBe(30);
  });

  it('no absorbe si no hay línea anterior (huérfana al inicio)', () => {
    const out = absorbOrphanDiscountLines(
      build([{ description: '', quantity: 0, unitPrice: 0, discount: 30 }]),
    );
    expect(out.lines).toHaveLength(1);
  });
});
