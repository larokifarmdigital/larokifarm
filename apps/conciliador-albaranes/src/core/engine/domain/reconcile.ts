import { cleanAlt, cleanNationalCode, parseNumber } from './numbers';
import type {
  DeliveryNoteData,
  DiscrepancyKind,
  OrderData,
  ReconciledLine,
  Reconciliation,
} from './types';

export const TOL_QUANTITY = 0.001;
export const TOL_PRICE = 0.01;
export const TOL_DISCOUNT = 0.01;

interface Item {
  cn: string; // Normalized National Code (6 digits) or ''
  alt: string; // Normalized alternative code / EAN, or ''
  cod: string; // Supplier's internal code (e.g. PEROX "UN14080", Nestlé "12578223") or ''
  description: string;
  units: number; // INVOICED units
  bonus: number; // free / promo units
  price: number;
  discount: number;
}

interface RawRow {
  cnRaw: unknown;
  altRaw: unknown;
  codRaw?: unknown;
  description: string;
  units: unknown;
  price: unknown;
  discount: unknown;
  freeUnitsRaw?: unknown;
}

interface NormLine {
  qty: number;
  price: number;
  discount: number;
  freeUnits: number;
}

function looksLikeFreebie(l: NormLine): boolean {
  return l.price === 0 || l.discount === 0 || l.discount === 100;
}

function mostUnits(ls: NormLine[]): NormLine {
  return ls.reduce((a, b) => (b.qty > a.qty ? b : a));
}

// NOTE: agrupa por identidad (C.N. → alt/EAN → cód. interno) y separa unidades facturadas de bonificaciones (dos formatos: columna BONIF. o línea aparte con precio 0). detectFreebies=false para el pedido.
function group(rows: RawRow[], detectFreebies: boolean): Item[] {
  const groups = new Map<
    string,
    { cn: string; alt: string; cod: string; description: string; lines: NormLine[] }
  >();

  for (const f of rows) {
    const cn = cleanNationalCode(f.cnRaw);
    const alt = cleanAlt(f.altRaw);
    const cod = cleanAlt(f.codRaw);
    const key = cn || alt || cod;
    if (!key) continue;
    let g = groups.get(key);
    if (!g) {
      g = { cn, alt, cod, description: f.description ?? '', lines: [] };
      groups.set(key, g);
    }
    if (!g.alt && alt) g.alt = alt;
    if (!g.cod && cod) g.cod = cod;
    if (!g.description) g.description = f.description ?? '';
    g.lines.push({
      qty: parseNumber(f.units),
      price: parseNumber(f.price),
      discount: parseNumber(f.discount),
      freeUnits: parseNumber(f.freeUnitsRaw),
    });
  }

  const items: Item[] = [];
  for (const g of groups.values()) {
    let invoiced: NormLine[];
    let bonus: number;

    if (!detectFreebies || g.lines.length === 1) {
      invoiced = g.lines;
      bonus = g.lines.reduce((s, l) => s + l.freeUnits, 0);
    } else {
      const inv = g.lines.filter((l) => !looksLikeFreebie(l));
      invoiced = inv.length > 0 ? inv : [mostUnits(g.lines)];
      const set = new Set(invoiced);
      // NOTE: no sumamos también el freeUnits de las líneas freebie o contaríamos el regalo dos veces.
      bonus = g.lines.reduce((s, l) => s + (set.has(l) ? l.freeUnits : l.qty), 0);
    }

    const charged = invoiced.reduce((s, l) => s + Math.max(0, l.qty - l.freeUnits), 0);
    const main = mostUnits(invoiced);
    items.push({
      cn: g.cn,
      alt: g.alt,
      cod: g.cod,
      description: g.description,
      units: charged,
      bonus,
      price: main.price,
      discount: main.discount,
    });
  }
  return items;
}

function visibleCode(p: Item | null, a: Item | null): string {
  return p?.cn || a?.cn || p?.alt || a?.alt || p?.cod || a?.cod || '';
}

function compareFields(p: Item, a: Item): DiscrepancyKind[] {
  const d: DiscrepancyKind[] = [];
  if (Math.abs(p.units - a.units) > TOL_QUANTITY) d.push('units');
  if (Math.abs(p.price - a.price) > TOL_PRICE) d.push('price');
  if (Math.abs(p.discount - a.discount) > TOL_DISCOUNT) d.push('discount');
  return d;
}

// NOTE: 3-level join C.N.(6 dígitos) → alt/EAN → cód. interno sin recortar. El cód. interno NUNCA pasa por cleanNationalCode; recortarlo colapsaba productos distintos (bug Marvis/Perrigo "5000036689" y "5000036691" → "500003").
export function reconcile(deliveryNote: DeliveryNoteData, order: OrderData): Reconciliation {
  // NOTE: productCode va a cn y cod para que un código numérico corto joinee por C.N. y uno alfanumérico (ej. "UN14080") por cód. interno.
  const orderItems = group(
    order.lines.map((l) => ({
      cnRaw: l.productCode,
      altRaw: l.alternativeCode,
      codRaw: l.productCode,
      description: l.description ?? '',
      units: l.units,
      price: l.price,
      discount: l.discount,
    })),
    false,
  );

  const deliveryItems = group(
    deliveryNote.lines.map((l) => ({
      cnRaw: l.nationalCode || '',
      altRaw: l.ean || '',
      codRaw: l.code || '',
      description: l.description ?? '',
      units: l.quantity,
      price: l.unitPrice,
      discount: l.discount ?? 0,
      freeUnitsRaw: l.freeUnits,
    })),
    true,
  );

  const orderUsed = new Array<boolean>(orderItems.length).fill(false);

  const findMatch = (a: Item): number => {
    if (a.cn) {
      const i = orderItems.findIndex((p, idx) => !orderUsed[idx] && p.cn !== '' && p.cn === a.cn);
      if (i >= 0) return i;
    }
    if (a.alt) {
      const i = orderItems.findIndex((p, idx) => !orderUsed[idx] && p.alt !== '' && p.alt === a.alt);
      if (i >= 0) return i;
    }
    if (a.cod) {
      const i = orderItems.findIndex((p, idx) => !orderUsed[idx] && p.cod !== '' && p.cod === a.cod);
      if (i >= 0) return i;
    }
    return -1;
  };

  const lines: ReconciledLine[] = [];

  for (const a of deliveryItems) {
    const idx = findMatch(a);
    if (idx >= 0) {
      orderUsed[idx] = true;
      const p = orderItems[idx];
      const discrepancies = compareFields(p, a);
      lines.push({
        nationalCode: visibleCode(p, a),
        description: a.description || p.description,
        unitsOrdered: p.units,
        unitsDelivered: a.units,
        freeUnitsDelivered: a.bonus,
        priceOrdered: p.price,
        priceDelivered: a.price,
        discountOrdered: p.discount,
        discountDelivered: a.discount,
        status: discrepancies.length === 0 ? 'OK' : 'DISCREPANCY',
        discrepancies,
      });
    } else {
      lines.push({
        nationalCode: visibleCode(null, a),
        description: a.description,
        unitsOrdered: null,
        unitsDelivered: a.units,
        freeUnitsDelivered: a.bonus,
        priceOrdered: null,
        priceDelivered: a.price,
        discountOrdered: null,
        discountDelivered: a.discount,
        status: 'EXTRA_IN_DELIVERY_NOTE',
        discrepancies: [],
      });
    }
  }

  orderItems.forEach((p, idx) => {
    if (orderUsed[idx]) return;
    lines.push({
      nationalCode: visibleCode(p, null),
      description: p.description,
      unitsOrdered: p.units,
      unitsDelivered: null,
      freeUnitsDelivered: null,
      priceOrdered: p.price,
      priceDelivered: null,
      discountOrdered: p.discount,
      discountDelivered: null,
      status: 'MISSING_IN_DELIVERY_NOTE',
      discrepancies: [],
    });
  });

  lines.sort((x, y) => {
    const px = x.status === 'OK' ? 1 : 0;
    const py = y.status === 'OK' ? 1 : 0;
    if (px !== py) return px - py;
    return x.nationalCode.localeCompare(y.nationalCode);
  });

  const totalDiscrepancies = lines.filter((l) => l.status !== 'OK').length;

  return {
    deliveryNoteNumber: deliveryNote.deliveryNoteNumber,
    supplier: deliveryNote.supplier ?? order.supplierName ?? '',
    lines,
    totalDiscrepancies,
    allMatch: totalDiscrepancies === 0,
  };
}

export function statusText(line: ReconciledLine): string {
  switch (line.status) {
    case 'OK':
      return 'OK';
    case 'DISCREPANCY':
      return `DISCREPANCIA: ${line.discrepancies.join(', ')}`;
    case 'MISSING_IN_DELIVERY_NOTE':
      return 'FALTA EN ALBARÁN';
    case 'EXTRA_IN_DELIVERY_NOTE':
      return 'SOBRA EN ALBARÁN (no pedido)';
  }
}
