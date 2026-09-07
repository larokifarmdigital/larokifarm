import { searchAllPharmaciesViaShopping } from '../infrastructure/googleShopping';
import { searchProductOnWeb } from '../infrastructure/googleWebSearch';
import { scrapeProductPageDirect } from '../infrastructure/genericScraping/scrapePharmacy';
import type { ComparisonReport, ComparisonRow } from '../domain/models';
import { resolveInput, type ResolveInputArgs } from './normalizeIdentifier';

export type CompareInput = ResolveInputArgs;

export type CompareUseCaseResult =
  | { ok: true; report: ComparisonReport }
  | { ok: false; error: string };

/** Máximo de farmacias adicionales del Web Search a scrapear (evita gasto excesivo).
 *  Cada scrape = 1-10 créditos ScraperAPI + posible render=true = hasta 25 créditos. */
const MAX_WEB_SCRAPES = 5;

/** Detecta si un nombre parece dominio (ej "okfarma.es") o un nombre común ("Farmacia San Pablo"). */
function looksLikeDomain(name: string): boolean {
  return /^[a-z0-9-]+(\.[a-z]{2,})+$/i.test(name.trim());
}

/** Devuelve el "domain-clave" para dedup: si pharmacyName parece dominio, ese; si no, null. */
function pharmacyDomainKey(pharmacyName: string): string | null {
  const trimmed = pharmacyName.trim().toLowerCase();
  return looksLikeDomain(trimmed) ? trimmed : null;
}

export async function comparePriceUseCase(input: CompareInput): Promise<CompareUseCaseResult> {
  const t0 = Date.now();

  const normalized = await resolveInput(input);
  if (!normalized.ok) return { ok: false, error: normalized.error };

  const query = [normalized.input.nombre, normalized.input.ean, normalized.input.cn]
    .filter(Boolean)
    .join(' ')
    .trim();

  console.log(`[compare] query="${query}"`);

  // Corremos AMBOS motores en paralelo: Shopping (precios directos) + Web (más cobertura)
  const [shoppingRes, webHits] = await Promise.all([
    searchAllPharmaciesViaShopping({
      cn: normalized.input.cn,
      ean: normalized.input.ean,
      nombre: normalized.input.nombre,
    }),
    searchProductOnWeb(query),
  ]);

  const shoppingRows: ComparisonRow[] = shoppingRes.ok ? shoppingRes.rows : [];
  console.log(`[compare] Shopping: ${shoppingRows.length} rows`);

  // Dedup: si una farmacia ya vino de Shopping, no la scrapeamos otra vez del Web
  const shoppingDomains = new Set(
    shoppingRows.map((r) => pharmacyDomainKey(r.pharmacyName)).filter((d): d is string => d !== null),
  );

  const newWebHits = webHits.filter((h) => !shoppingDomains.has(h.domain)).slice(0, MAX_WEB_SCRAPES);
  console.log(
    `[compare] Web hits nuevos (no en Shopping, top ${MAX_WEB_SCRAPES}): ${newWebHits.length}/${webHits.length}`,
  );

  // Scrapeamos las URLs de Web en paralelo (cada una = 1-25 créditos ScraperAPI según render)
  const webRows: ComparisonRow[] = await Promise.all(
    newWebHits.map((hit) => scrapeProductPageDirect(hit.url, hit.domain)),
  );

  // Merge: primero Shopping (precio ya extraído, más fiable), luego Web (con o sin precio)
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
    normalized.input.cn && normalized.input.nombre && normalized.input.nombre !== normalized.input.cn
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
