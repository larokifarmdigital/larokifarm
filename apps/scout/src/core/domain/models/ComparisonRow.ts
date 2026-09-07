/**
 * Fila del reporte comparativo: una farmacia con su precio y contexto.
 */
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
  /** true si el URL sale del descubrimiento por Google (Search o Shopping) — es la ficha real. */
  urlVerificada?: boolean;
  /**
   * alto = strategy determinista extrajo el precio (JSON-LD, microdata, Shopify…).
   * medio = fallback Gemini extrajo el precio del HTML.
   * bajo = reservado, no se usa aún.
   */
  precioConfianza?: 'alto' | 'medio' | 'bajo';
};
