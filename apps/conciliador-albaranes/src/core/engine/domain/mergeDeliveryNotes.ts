import { cleanAlt, cleanNationalCode } from './numbers';
import type { DeliveryNoteData, DeliveryNoteLine } from './types';

/**
 * Merges N delivery notes / invoices of the SAME shipment into a single
 * `DeliveryNoteData`.
 *
 * Some suppliers split the information of the same order across several
 * PDFs: the delivery note carries quantities and EAN; the invoice carries
 * price and discount. To reconcile against the order (Excel) we need a
 * single structure with every field filled in.
 *
 * How it crosses lines across PDFs:
 *   Union-find over ALL identifiers. Two lines are considered the same
 *   product if they share C.N., EAN or the supplier's internal code — any
 *   of the three. This is required for cases like PEROX where the invoice
 *   ONLY carries the internal code and the delivery note carries all three.
 *
 * How it picks each field's value (priority by source):
 *   - quantity, freeUnits, EAN, lot   ← DELIVERY NOTE
 *   - unitPrice, discount, C.N.       ← INVOICE
 *   - code, description               ← whichever is non-empty
 *   - If the preferred source has no value, falls back to the other.
 *
 * Header (deliveryNoteNumber, supplier, date, orderNumber): first non-empty
 * value, preferring the delivery note for deliveryNoteNumber/date and the
 * invoice for orderNumber. In practice they usually match across PDFs.
 */
export function mergeDeliveryNotes(deliveryNotes: DeliveryNoteData[]): DeliveryNoteData {
  if (deliveryNotes.length === 0) {
    return { deliveryNoteNumber: '', lines: [] };
  }
  if (deliveryNotes.length === 1) {
    return deliveryNotes[0];
  }

  // 1. Flatten every line tagged with its source PDF.
  const items: Source[] = [];
  for (const a of deliveryNotes) {
    for (const line of a.lines) {
      items.push({ kind: a.documentKind ?? 'other', line });
    }
  }

  // 2. Union-find: two lines join if they share C.N., EAN or internal code.
  const parent = items.map((_, i) => i);
  const find = (x: number): number =>
    parent[x] === x ? x : (parent[x] = find(parent[x]));
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };

  const indexByKey = new Map<string, number[]>();
  items.forEach((it, i) => {
    const cn = cleanNationalCode(it.line.nationalCode);
    const ean = cleanAlt(it.line.ean);
    const cod = cleanAlt(it.line.code);
    const keys = [
      cn ? `cn:${cn}` : '',
      ean ? `ean:${ean}` : '',
      cod ? `cod:${cod}` : '',
    ].filter((k) => k !== '');
    for (const k of keys) {
      const list = indexByKey.get(k) ?? [];
      list.push(i);
      indexByKey.set(k, list);
    }
  });

  for (const indices of indexByKey.values()) {
    for (let i = 1; i < indices.length; i++) union(indices[0], indices[i]);
  }

  // 3. Group lines by root and merge each group.
  const groups = new Map<number, Source[]>();
  items.forEach((it, i) => {
    const r = find(i);
    const list = groups.get(r) ?? [];
    list.push(it);
    groups.set(r, list);
  });

  const lines: DeliveryNoteLine[] = [];
  for (const group of groups.values()) {
    lines.push(mergeLines(group));
  }

  // 4. Header: first non-empty fields, preferring delivery note for
  // deliveryNoteNumber and date; invoice for orderNumber.
  const deliveryNoteFirst = [...deliveryNotes].sort(
    (a, b) =>
      (a.documentKind === 'deliveryNote' ? 0 : 1) -
      (b.documentKind === 'deliveryNote' ? 0 : 1),
  );
  const invoiceFirst = [...deliveryNotes].sort(
    (a, b) =>
      (a.documentKind === 'invoice' ? 0 : 1) -
      (b.documentKind === 'invoice' ? 0 : 1),
  );

  return {
    deliveryNoteNumber: firstStr(deliveryNoteFirst, (a) => a.deliveryNoteNumber) ?? '',
    supplier: firstStr(deliveryNoteFirst, (a) => a.supplier),
    date: firstStr(deliveryNoteFirst, (a) => a.date),
    orderNumber: firstStr(invoiceFirst, (a) => a.orderNumber),
    documentKind: 'other',
    lines,
  };
}

interface Source {
  kind: NonNullable<DeliveryNoteData['documentKind']>;
  line: DeliveryNoteLine;
}

/** Merges the lines of a same product coming from several PDFs. */
function mergeLines(group: Source[]): DeliveryNoteLine {
  const deliveryNote = group.filter((o) => o.kind === 'deliveryNote');
  const invoice = group.filter((o) => o.kind === 'invoice');
  const other = group.filter((o) => o.kind === 'other');

  // Per-field priority: first the list that "wins", then the others.
  const deliveryNoteOrder = [...deliveryNote, ...other, ...invoice];
  const invoiceOrder = [...invoice, ...deliveryNote, ...other];
  const anyOrder = group;

  return {
    code: pickStr(anyOrder, (l) => l.code),
    nationalCode: pickStr(invoiceOrder, (l) => l.nationalCode),
    ean: pickStr(deliveryNoteOrder, (l) => l.ean),
    description: pickStr(deliveryNoteOrder, (l) => l.description) ?? '',
    quantity: pickNum(deliveryNoteOrder, (l) => l.quantity) ?? 0,
    unitPrice: pickNum(invoiceOrder, (l) => l.unitPrice) ?? 0,
    discount: pickNumIncl0(invoiceOrder, (l) => l.discount),
    freeUnits: pickNum(deliveryNoteOrder, (l) => l.freeUnits),
  };
}

/** First non-empty string walking `sources` in order. */
function pickStr(sources: Source[], get: (l: DeliveryNoteLine) => string | undefined): string | undefined {
  for (const o of sources) {
    const v = get(o.line);
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return undefined;
}

/** First non-zero (and defined) number. 0 is treated as "not reported". */
function pickNum(sources: Source[], get: (l: DeliveryNoteLine) => number | undefined): number | undefined {
  for (const o of sources) {
    const v = get(o.line);
    if (typeof v === 'number' && v !== 0) return v;
  }
  return undefined;
}

/** First defined number (including 0 — useful for "discount: 0 is informed"). */
function pickNumIncl0(sources: Source[], get: (l: DeliveryNoteLine) => number | undefined): number | undefined {
  for (const o of sources) {
    const v = get(o.line);
    if (typeof v === 'number') return v;
  }
  return undefined;
}

/** First non-empty string of a header property. */
function firstStr(
  sources: DeliveryNoteData[],
  get: (a: DeliveryNoteData) => string | undefined,
): string | undefined {
  for (const a of sources) {
    const v = get(a);
    if (v && v.trim() !== '') return v;
  }
  return undefined;
}
