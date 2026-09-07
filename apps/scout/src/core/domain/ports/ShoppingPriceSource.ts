import type { ComparisonRow } from '../models/ComparisonRow';

/**
 * Puerto: fuente que devuelve DIRECTAMENTE precios comparados de un producto.
 * Implementación típica: Google Shopping (via ScraperAPI structured endpoint).
 *
 * Contrato:
 * - Recibe input normalizado (cn/ean/nombre).
 * - Devuelve rows con precio ya extraído, o error legible si algo falla.
 * - Aplica su propio filtrado semántico (match de keywords, exclusión de variantes).
 */
export interface ShoppingSearchInput {
  cn?: string;
  ean?: string;
  nombre?: string;
}

export type ShoppingSearchResult =
  | { ok: true; rows: ComparisonRow[] }
  | { ok: false; error: string };

export interface ShoppingPriceSource {
  search(input: ShoppingSearchInput): Promise<ShoppingSearchResult>;
}
