import type { ComparisonReport, ComparisonRow } from '@/core/domain/models';
import type { PharmacyPageScraper } from '@/core/domain/ports/PharmacyPageScraper';
import type { ProductIdentifier } from '@/core/domain/ports/ProductIdentifier';
import type { ShoppingPriceSource } from '@/core/domain/ports/ShoppingPriceSource';
import type { WebProductFinder } from '@/core/domain/ports/WebProductFinder';
import { resolveInput, type ResolveInputArgs } from './resolveInput';

/**
 * Dependencias del use case comparePrice.
 * Inyección explícita para permitir testing con stubs y swap de implementaciones.
 */
export interface ComparePriceDeps {
  productIdentifier: ProductIdentifier;
  shoppingSource: ShoppingPriceSource;
  webFinder: WebProductFinder;
  pageScraper: PharmacyPageScraper;
}

export type ComparePriceInput = ResolveInputArgs;

export type ComparePriceResult =
  | { ok: true; report: ComparisonReport }
  | { ok: false; error: string };

/**
 * Máximo de farmacias adicionales del Web Search a scrapear (evita gasto excesivo).
 * Cada scrape = 1-10 créditos ScraperAPI + posible render=true = hasta 25 créditos.
 */
const MAX_WEB_SCRAPES = 5;

/** Detecta si un nombre parece dominio (ej "okfarma.es") o un nombre común. */
function looksLikeDomain(name: string): boolean {
  return /^[a-z0-9-]+(\.[a-z]{2,})+$/i.test(name.trim());
}

function pharmacyDomainKey(pharmacyName: string): string | null {
  const trimmed = pharmacyName.trim().toLowerCase();
  return looksLikeDomain(trimmed) ? trimmed : null;
}

/**
 * Use case: dado un input crudo (CN/EAN/nombre) y las dependencias de infra,
 * orquesta la búsqueda paralela en Shopping + Web y devuelve un reporte comparado.
 *
 * Es una función pura de sus dependencias — no importa nada de infrastructure/.
 * Testing = pasar stubs de los 4 ports.
 */
export async function comparePrice(
  input: ComparePriceInput,
  deps: ComparePriceDeps,
): Promise<ComparePriceResult> {
  const t0 = Date.now();

  const normalized = await resolveInput(input, deps.productIdentifier);
  if (!normalized.ok) return { ok: false, error: normalized.error };

  const query = [normalized.input.nombre, normalized.input.ean, normalized.input.cn]
    .filter(Boolean)
    .join(' ')
    .trim();

  console.log(`[compare] query="${query}"`);

  // Corremos AMBOS motores en paralelo: Shopping (precios directos) + Web (más cobertura)
  const [shoppingRes, webHits] = await Promise.all([
    deps.shoppingSource.search({
      cn: normalized.input.cn,
      ean: normalized.input.ean,
      nombre: normalized.input.nombre,
    }),
    deps.webFinder.findPharmacies(query),
  ]);

  const shoppingRows: ComparisonRow[] = shoppingRes.ok ? shoppingRes.rows : [];
  console.log(`[compare] Shopping: ${shoppingRows.length} rows`);

  // Dedup: si una farmacia ya vino de Shopping, no la scrapeamos otra vez del Web
  const shoppingDomains = new Set(
    shoppingRows
      .map((r) => pharmacyDomainKey(r.pharmacyName))
      .filter((d): d is string => d !== null),
  );

  const newWebHits = webHits
    .filter((h) => !shoppingDomains.has(h.domain))
    .slice(0, MAX_WEB_SCRAPES);
  console.log(
    `[compare] Web hits nuevos (no en Shopping, top ${MAX_WEB_SCRAPES}): ${newWebHits.length}/${webHits.length}`,
  );

  // Scrapeamos las URLs de Web en paralelo
  const webRows: ComparisonRow[] = await Promise.all(
    newWebHits.map((hit) => deps.pageScraper.scrape(hit.url, hit.domain)),
  );

  const allRows: ComparisonRow[] = [...shoppingRows, ...webRows];

  if (allRows.length === 0) {
    return {
      ok: false,
      error: shoppingRes.ok
        ? 'Ni Google Shopping ni Google Web devolvieron farmacias que vendan este producto exacto.'
        : shoppingRes.error,
    };
  }

  const product =
    normalized.input.cn &&
    normalized.input.nombre &&
    normalized.input.nombre !== normalized.input.cn
      ? { nombre: normalized.input.nombre }
      : undefined;

  return {
    ok: true,
    report: {
      input: normalized.input,
      product,
      rows: allRows,
      totalMs: Date.now() - t0,
    },
  };
}
