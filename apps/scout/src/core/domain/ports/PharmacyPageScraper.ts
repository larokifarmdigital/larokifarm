import type { ComparisonRow } from '../models/ComparisonRow';

/**
 * Puerto: scrapea una URL específica de ficha de producto y devuelve el precio.
 * Implementación típica: fetch + cheerio + cascada de strategies + fallback IA.
 *
 * Contrato:
 * - Recibe una URL directa a la ficha.
 * - Devuelve siempre una ComparisonRow (con precio si pudo, o `status='not-found'` si no).
 * - No lanza excepciones — cualquier error se traduce a row con errorMessage.
 */
export interface PharmacyPageScraper {
  scrape(url: string, pharmacyName: string): Promise<ComparisonRow>;
}
