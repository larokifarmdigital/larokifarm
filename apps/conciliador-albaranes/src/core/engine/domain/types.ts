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

export interface DeliveryNoteData {
  deliveryNoteNumber: string;
  supplier?: string;
  date?: string;
  orderNumber?: string;
  /** Rol del PDF dentro del envío (albarán/factura), lo clasifica Gemini y lo usa el merger multi-PDF. */
  documentKind?: 'deliveryNote' | 'invoice' | 'other';
  lines: DeliveryNoteLine[];
}

export interface OrderLine {
  productCode: string;
  /** Alternative code / EAN (secondary join key if national code does not match). */
  alternativeCode?: string;
  description?: string;
  units: number;
  price: number;
  discount: number;
}

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

export interface Reconciliation {
  deliveryNoteNumber: string;
  supplier: string;
  lines: ReconciledLine[];
  totalDiscrepancies: number;
  allMatch: boolean;
}
