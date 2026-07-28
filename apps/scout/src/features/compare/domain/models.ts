import type { Extraction, ProbeResult } from '@/features/price-probe/domain/models/Extraction';

/** Resultado por farmacia devuelto por el motor Gemini + Google Search. */
export type ComparisonRow = {
  /** ID sintético (dominio o nombre slug) para React keys y logs. */
  pharmacyId: string;
  pharmacyName: string;
  productUrl: string | null;
  status: 'ok' | 'not-found';
  errorMessage?: string;
  precio?: number;
  moneda?: string;
  disponibilidad?: 'en_stock' | 'agotado' | 'desconocido';
  /** true si productUrl coincide con una URL real que Google Search devolvió como fuente.
      false → Gemini construyó/adaptó la URL: puede ser falsa (404) o correcta pero sin verificar. */
  urlVerificada?: boolean;
  /** Nivel de confianza del precio según cómo lo interpretó Gemini del snippet.
      alto = precio explícito en el resultado; medio = inferido; bajo = mencionado indirectamente. */
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

/** Producto identificado por Gemini a partir de los snippets de Google Search. */
export type IdentifiedProduct = {
  nombre: string;
  presentacion?: string;
  fabricante?: string;
};

export type ComparisonReport = {
  input: NormalizedInput;
  /** Producto identificado por Gemini de los resultados de Google. Undefined si no se pudo. */
  product?: IdentifiedProduct;
  rows: ComparisonRow[];
  totalMs: number;
};

// Los tipos legacy de scraper (PharmacySearchOutcome, MatchStatus) se eliminaron
// tras migrar a Gemini + Google Search como motor único.
export type ExtractionOk = Extract<ProbeResult, { ok: true }>;
