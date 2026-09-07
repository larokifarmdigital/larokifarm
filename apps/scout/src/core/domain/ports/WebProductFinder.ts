/**
 * Puerto: descubre URLs de fichas de producto en la web general (fuera de Shopping).
 * Implementación típica: Google Web Search (via ScraperAPI structured endpoint).
 *
 * Complementa el ShoppingPriceSource: cubre farmacias indexadas por Google que no
 * participan de Google Merchant Center.
 */
export interface WebProductHit {
  /** Dominio limpio (sin www, sin protocolo). Ej: "dosfarma.com". */
  domain: string;
  /** URL completa a la ficha del producto (ya desenvuelta si venía como goto). */
  url: string;
  title: string;
}

export interface WebProductFinder {
  findPharmacies(query: string, maxDomains?: number): Promise<WebProductHit[]>;
}
