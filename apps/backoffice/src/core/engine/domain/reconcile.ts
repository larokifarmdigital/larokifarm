import { descriptionMatches } from './descriptionMatch';
import { dropBorrowedCodes } from './dropBorrowedCodes';
import { cleanAlt, cleanNationalCode, cnCandidates, combineDiscounts, parseNumber, rescueNationalCode } from './numbers';
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
  cnAlts: string[]; // Otros candidatos a C.N. de la línea (Bayer: 2 códigos apilados en la celda), por preferencia
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
  cnAltsRaw?: unknown[];
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

// Regalo = el proveedor no cobra la línea: precio 0 o descuento del 100 %.
// `discount === 0` es venta normal: confundirlo comía líneas de venta cuando el mismo
// producto venía en dos lotes sin descuento.
function looksLikeFreebie(l: NormLine): boolean {
  return l.price === 0 || l.discount === 100;
}

function mostUnits(ls: NormLine[]): NormLine {
  return ls.reduce((a, b) => (b.qty > a.qty ? b : a));
}

// NOTE: agrupa por identidad (C.N. → alt/EAN → cód. interno) y separa unidades facturadas de bonificaciones (dos formatos: columna BONIF. o línea aparte con precio 0). detectFreebies=false para el pedido.
function group(rows: RawRow[], detectFreebies: boolean): Item[] {
  const groups = new Map<
    string,
    { cn: string; cnAlts: string[]; alt: string; cod: string; description: string; lines: NormLine[] }
  >();

  rows.forEach((f, idx) => {
    const cn = cleanNationalCode(f.cnRaw);
    // cnAltsRaw ya viene normalizado por cnCandidates() desde el llamador.
    const cnAlts = (f.cnAltsRaw ?? []).map((c) => cleanNationalCode(c)).filter((c) => c && c !== cn);
    const alt = cleanAlt(f.altRaw);
    const cod = cleanAlt(f.codRaw);
    // Sin identificadores: sintético único por fila. Sigue siendo un Item propio para poder
    // cruzarse por descripción en findMatch.
    const key = cn || cnAlts[0] || alt || cod || `noid:${idx}`;
    let g = groups.get(key);
    if (!g) {
      g = { cn, cnAlts: [...cnAlts], alt, cod, description: f.description ?? '', lines: [] };
      groups.set(key, g);
    }
    for (const c of cnAlts) if (c !== g.cn && !g.cnAlts.includes(c)) g.cnAlts.push(c);
    if (!g.alt && alt) g.alt = alt;
    if (!g.cod && cod) g.cod = cod;
    if (!g.description) g.description = f.description ?? '';
    g.lines.push({
      qty: parseNumber(f.units),
      price: parseNumber(f.price),
      discount: parseNumber(f.discount),
      freeUnits: parseNumber(f.freeUnitsRaw),
    });
  });

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
      cnAlts: g.cnAlts,
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
  return p?.cn || a?.cn || p?.alt || a?.cnAlts[0] || a?.alt || p?.cod || a?.cod || '';
}

const rescueCn = rescueNationalCode;

// Margen para el error de coma flotante: 17,47 − 17,46 da 0,0100000000000016
// y sin él una diferencia de justo 1 céntimo (dentro de la tolerancia) salía
// como discrepancia de precio.
const FLOAT_EPS = 1e-9;

function compareFields(p: Item, a: Item): DiscrepancyKind[] {
  const d: DiscrepancyKind[] = [];
  if (Math.abs(p.units - a.units) > TOL_QUANTITY + FLOAT_EPS) d.push('units');
  if (Math.abs(p.price - a.price) > TOL_PRICE + FLOAT_EPS) d.push('price');
  if (Math.abs(p.discount - a.discount) > TOL_DISCOUNT + FLOAT_EPS) d.push('discount');
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
    dropBorrowedCodes(deliveryNote.lines, order.lines).map((l) => {
      // Caso Bayer y similares: la celda "Código de producto" trae 2 códigos apilados
      // (interno + C.N.) y Gemini no siempre elige bien el C.N. Todos los códigos de la línea
      // (code, ean y la lista `codes`) pasan a cnAlts: findMatch los prueba tras el cn principal.
      const cnAlts = cnCandidates([l.nationalCode, ...(l.codes ?? []), l.code, l.ean]);
      return {
        cnRaw: rescueCn(l.nationalCode, l.code),
        cnAltsRaw: cnAlts,
        altRaw: l.ean || '',
        codRaw: l.code || '',
        description: l.description ?? '',
        units: l.quantity,
        price: l.unitPrice,
        discount: combineDiscounts(l.discount, l.invoiceDiscount),
        freeUnitsRaw: l.freeUnits,
      };
    }),
    true,
  );

  const orderUsed = new Array<boolean>(orderItems.length).fill(false);

  const itemHasIdentifier = (it: Item): boolean =>
    Boolean(it.cn || it.cnAlts.length > 0 || it.alt || it.cod);

  const findMatch = (a: Item): number => {
    if (a.cn) {
      const i = orderItems.findIndex((p, idx) => !orderUsed[idx] && p.cn !== '' && p.cn === a.cn);
      if (i >= 0) return i;
    }
    for (const cand of a.cnAlts) {
      const i = orderItems.findIndex((p, idx) => !orderUsed[idx] && p.cn !== '' && p.cn === cand);
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
    // Fallback por descripción: sólo si al menos un lado NO tiene ningún
    // identificador. Evita cruzar dos SKUs con códigos distintos aunque la
    // descripción se parezca (contexto Zambon: pedido-PDF sin códigos).
    const aHasId = itemHasIdentifier(a);
    const i = orderItems.findIndex(
      (p, idx) =>
        !orderUsed[idx] &&
        (!aHasId || !itemHasIdentifier(p)) &&
        descriptionMatches(a.description, p.description),
    );
    if (i >= 0) return i;
    return -1;
  };

  const matchOf = deliveryItems.map((a) => {
    const idx = findMatch(a);
    if (idx >= 0) orderUsed[idx] = true;
    return idx;
  });

  // 2ª pasada: líneas del albarán sin ningún candidato a C.N. que no han
  // cruzado (caso Bayer "SUPRADYN ENERGY EFERVESCENTE": la factura solo trae el
  // interno del proveedor, que el pedido no conoce). Se cruzan por descripción
  // aunque el pedido tenga C.N., pero solo si además coinciden unidades y
  // precio, y solo contra líneas del pedido que nadie ha reclamado.
  deliveryItems.forEach((a, k) => {
    if (matchOf[k] >= 0 || a.cn || a.cnAlts.length > 0) return;
    const i = orderItems.findIndex(
      (p, idx) =>
        !orderUsed[idx] &&
        Math.abs(p.units - a.units) <= TOL_QUANTITY &&
        Math.abs(p.price - a.price) <= TOL_PRICE &&
        descriptionMatches(a.description, p.description),
    );
    if (i >= 0) {
      orderUsed[i] = true;
      matchOf[k] = i;
    }
  });

  const lines: ReconciledLine[] = [];

  deliveryItems.forEach((a, k) => {
    const idx = matchOf[k];
    if (idx >= 0) {
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
        // Muestras/regalos que no estaban en el pedido (caso NAOS: 16 "MUESTRA"
        // con 10 uds bonificadas a 0 €): se muestran como REGALO y no cuentan
        // como discrepancia, porque no hay nada que reclamar.
        status: isGift(a) ? 'GIFT' : 'EXTRA_IN_DELIVERY_NOTE',
        discrepancies: [],
      });
    }
  });

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
    const px = isClean(x) ? 1 : 0;
    const py = isClean(y) ? 1 : 0;
    if (px !== py) return px - py;
    return x.nationalCode.localeCompare(y.nationalCode);
  });

  const totalDiscrepancies = lines.filter((l) => !isClean(l)).length;

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
    case 'GIFT':
      return 'REGALO (no pedido)';
  }
}

/** Línea sin nada que revisar: OK o regalo no pedido. */
export function isClean(line: ReconciledLine): boolean {
  return line.status === 'OK' || line.status === 'GIFT';
}

// Regalo = no se cobra nada: 0 uds facturadas con unidades bonificadas, o
// precio 0 (muestras que el proveedor manda sin columna de bonificación).
function isGift(a: Item): boolean {
  return (a.units === 0 && a.bonus > 0) || (a.price === 0 && a.units + a.bonus > 0);
}
