import type { ProbeResult } from '@/features/price-probe/domain/models/Extraction';

/** Resultado por farmacia devuelto por el motor de scraping genérico. */
export type ComparisonRow = {
  /** ID sintético (dominio) para React keys y logs. */
  pharmacyId: string;
  pharmacyName: string;
  productUrl: string | null;
  status: 'ok' | 'not-found';
  errorMessage?: string;
  precio?: number;
  moneda?: string;
  disponibilidad?: 'en_stock' | 'agotado' | 'desconocido';
  /** true si el URL sale del descubrimiento por Google (Serper) — es la ficha real de la farmacia. */
  urlVerificada?: boolean;
  /** alto = strategy determinista extrajo el precio (JSON-LD, microdata, Shopify…).
      medio = fallback Gemini extrajo el precio del HTML.
      bajo = reservado, no se usa aún. */
  precioConfianza?: 'alto' | 'medio' | 'bajo';
};

export type NormalizedInput = {
  raw: string;
  ean?: string;
  nombre?: string;
  /** De dónde salió el trigger principal — el CN gana si está, luego EAN, luego nombre libre. */
  origen: 'ean' | 'cn' | 'nombre';
  cn?: string;
  nombreHint?: string;
};

/** Producto identificado. En el motor genérico se rellena con lo que devuelve CIMA (si aplica). */
export type IdentifiedProduct = {
  nombre: string;
  presentacion?: string;
  fabricante?: string;
};

export type ComparisonReport = {
  input: NormalizedInput;
  product?: IdentifiedProduct;
  rows: ComparisonRow[];
  totalMs: number;
};

export type ExtractionOk = Extract<ProbeResult, { ok: true }>;
