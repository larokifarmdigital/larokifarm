import { absorbOrphanDiscountLines } from './absorbOrphanDiscountLines';
import { cleanAlt, cleanNationalCode } from './numbers';
import type { DeliveryNoteData, DeliveryNoteLine } from './types';

// NOTE: fusiona N PDFs del mismo envío (albarán+factura). Union-find sobre C.N./EAN/cód. interno. Prioridad por campo: qty/freeUnits/EAN ← albarán; unitPrice/discount/C.N. ← factura.
export function mergeDeliveryNotes(deliveryNotes: DeliveryNoteData[]): DeliveryNoteData {
  if (deliveryNotes.length === 0) {
    return { deliveryNoteNumber: '', lines: [] };
  }
  // NOTE: absorbe líneas huérfanas de descuento generadas por saltos de página antes de cualquier fusión (aplica también con 1 PDF).
  const preCleaned = deliveryNotes.map(absorbOrphanDiscountLines);
  if (preCleaned.length === 1) {
    return preCleaned[0];
  }

  const items: Source[] = [];
  for (const a of preCleaned) {
    for (const line of a.lines) {
      items.push({ kind: a.documentKind ?? 'other', line });
    }
  }

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

function mergeLines(group: Source[]): DeliveryNoteLine {
  const deliveryNote = group.filter((o) => o.kind === 'deliveryNote');
  const invoice = group.filter((o) => o.kind === 'invoice');
  const other = group.filter((o) => o.kind === 'other');

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

function pickStr(sources: Source[], get: (l: DeliveryNoteLine) => string | undefined): string | undefined {
  for (const o of sources) {
    const v = get(o.line);
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return undefined;
}

// NOTE: 0 se trata como "no informado".
function pickNum(sources: Source[], get: (l: DeliveryNoteLine) => number | undefined): number | undefined {
  for (const o of sources) {
    const v = get(o.line);
    if (typeof v === 'number' && v !== 0) return v;
  }
  return undefined;
}

// NOTE: 0 cuenta como valor válido (ej. "descuento 0 informado").
function pickNumIncl0(sources: Source[], get: (l: DeliveryNoteLine) => number | undefined): number | undefined {
  for (const o of sources) {
    const v = get(o.line);
    if (typeof v === 'number') return v;
  }
  return undefined;
}

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
