/**
 * Composition Root.
 *
 * Único lugar donde se instancian y agrupan los adapters concretos.
 * El resto de la app depende de las interfaces (ports) — este archivo es
 * quien decide qué implementación usar en runtime.
 *
 * Reemplazar `productionDeps` por una versión con stubs para testing E2E.
 */

import type { ComparePriceDeps } from './application/comparePrice';
import { cimaProductIdentifier } from './infrastructure/identifier/cimaProductIdentifier';
import { pharmacyPageScraper } from './infrastructure/scraper/pharmacyPageScraper';
import { googleShoppingSource } from './infrastructure/shopping/googleShoppingSource';
import { googleWebFinder } from './infrastructure/web/googleWebFinder';

export const productionDeps: ComparePriceDeps = {
  productIdentifier: cimaProductIdentifier,
  shoppingSource: googleShoppingSource,
  webFinder: googleWebFinder,
  pageScraper: pharmacyPageScraper,
};
