/**
 * Reconciliation engine domain types. Pure core: no Next, no HTTP, no DB.
 * Runs identically in Node (tests) and in the Cloudflare Workers runtime.
 *
 * Domain vocabulary (Spanish pharma context translated to English):
 *   - "albarán"        → delivery note (proof-of-delivery shipped with the goods)
 *   - "pedido"         → order (purchase order placed by the pharmacy)
 *   - "factura"        → invoice
 *   - "proveedor"      → supplier
 *   - "Código Nacional" → "national code" (Spanish 6-digit pharma product code)
 *   - "bonificación"   → bonus / free units (giveaway / promo units)
 */

/** Line item extracted from a delivery-note PDF (via Gemini). */
export interface DeliveryNoteLine {
  code?: string;
  /** Spanish "Código Nacional" — 6-digit pharma product code. */
  nationalCode?: string;
  /** Barcode / EAN / alternative product code, if present. */
  ean?: string;
  description: string;
  /** Invoiced units (UDS), excluding free/bonus units. */
  quantity: number;
  unitPrice: number;
  discount?: number;
  /** Free / bonus units (from the BONIF. column, if any). */
  freeUnits?: number;
}

/** Structured data of a delivery-note PDF. */
export interface DeliveryNoteData {
  deliveryNoteNumber: string;
  supplier?: string;
  date?: string;
  orderNumber?: string;
  /**
   * Role of this PDF within the shipment (used by the multi-PDF merger to
   * prioritize sources: quantity & EAN come from delivery note; price &
   * discount from invoice). Classified by Gemini from the PDF headers.
   */
  documentKind?: 'deliveryNote' | 'invoice' | 'other';
  lines: DeliveryNoteLine[];
}

/** Order line read from the client's Excel. */
export interface OrderLine {
  productCode: string;
  /** Alternative code / EAN (secondary join key if national code does not match). */
  alternativeCode?: string;
  description?: string;
  units: number;
  price: number;
  discount: number;
}

/** Order data (from the Excel). Supplier fields are optional (pending decision #1). */
export interface OrderData {
  supplierNumber?: string;
  supplierName?: string;
  lines: OrderLine[];
}

export type DiscrepancyKind = 'units' | 'price' | 'discount';

export type ReconciliationStatus =
  | 'OK'
  | 'DISCREPANCY'
  | 'MISSING_IN_DELIVERY_NOTE' // ordered but not shipped
  | 'EXTRA_IN_DELIVERY_NOTE'; // shipped but not ordered

/** A row of the reconciliation report: one National Code joined order ↔ delivery note. */
export interface ReconciledLine {
  nationalCode: string;
  description: string;
  unitsOrdered: number | null;
  unitsDelivered: number | null;
  /** Bonus / free units shipped (do NOT count as discrepancy). */
  freeUnitsDelivered: number | null;
  priceOrdered: number | null;
  priceDelivered: number | null;
  discountOrdered: number | null;
  discountDelivered: number | null;
  status: ReconciliationStatus;
  discrepancies: DiscrepancyKind[];
}

/** Result of reconciling a delivery note against its order. */
export interface Reconciliation {
  deliveryNoteNumber: string;
  supplier: string;
  lines: ReconciledLine[];
  totalDiscrepancies: number;
  allMatch: boolean;
}
