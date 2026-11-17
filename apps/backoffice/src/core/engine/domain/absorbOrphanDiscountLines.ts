import type { DeliveryNoteData, DeliveryNoteLine } from './types';

// NOTE: absorbe "líneas huérfanas" de descuento (dto% + importe negativo sin código/descripción) que Gemini a veces emite como líneas propias por culpa del corte de página en facturas tipo FAES FARMA. El descuento se aplica al artículo inmediatamente anterior (o se suma si ya tenía descuento — descuentos compuestos).
export function absorbOrphanDiscountLines(data: DeliveryNoteData): DeliveryNoteData {
  const cleaned: DeliveryNoteLine[] = [];
  for (const line of data.lines) {
    if (isOrphanDiscount(line) && cleaned.length > 0) {
      const prev = cleaned[cleaned.length - 1];
      const prevDto = prev.discount ?? 0;
      const addDto = line.discount ?? 0;
      prev.discount = prevDto + addDto;
      continue;
    }
    cleaned.push({ ...line });
  }
  return { ...data, lines: cleaned };
}

function isOrphanDiscount(line: DeliveryNoteLine): boolean {
  const noCode =
    !nonEmpty(line.code) &&
    !nonEmpty(line.nationalCode) &&
    !nonEmpty(line.ean);
  const noDesc = !nonEmpty(line.description);
  const noQty = !line.quantity || line.quantity === 0;
  const noPrice = !line.unitPrice || line.unitPrice === 0;
  const hasDto = typeof line.discount === 'number' && line.discount > 0;
  return noCode && noDesc && noQty && noPrice && hasDto;
}

function nonEmpty(s: string | undefined | null): boolean {
  return typeof s === 'string' && s.trim() !== '';
}
