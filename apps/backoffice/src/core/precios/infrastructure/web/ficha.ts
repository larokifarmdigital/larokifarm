import * as cheerio from 'cheerio';
import { parsePrecio } from '../../domain/codigos';

type Nodo = Record<string, unknown>;

/** Primer Product del JSON-LD de una ficha (también dentro de @graph o de un array). */
export function productoJsonLd(html: string): Nodo | null {
  const $ = cheerio.load(html);
  let prod: Nodo | null = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (prod) return;
    try {
      const raiz = JSON.parse($(el).text()) as unknown;
      const nodos = (Array.isArray(raiz) ? raiz : [raiz]).flatMap((n) =>
        n && typeof n === 'object' ? [n as Nodo, ...(((n as Nodo)['@graph'] as Nodo[] | undefined) ?? [])] : [],
      );
      prod = nodos.find((n) => [n['@type']].flat().includes('Product')) ?? null;
    } catch {
      // bloque JSON-LD mal formado: se prueba el siguiente
    }
  });
  return prod;
}

/**
 * Precio de UNA unidad. Ojo: en un AggregateOffer `lowPrice` suele ser el
 * precio por cantidad (3+ unidades) — se usa el `price` de la oferta de menor
 * cantidad y, si no lo hay, `highPrice`/`price` antes que `lowPrice`.
 */
export function precioUnidad(prod: Nodo | null): number | null {
  if (!prod) return null;
  const ofertas = [prod.offers].flat().filter((o): o is Nodo => !!o && typeof o === 'object');
  const planas = ofertas.flatMap((o) => (o['@type'] === 'AggregateOffer' && Array.isArray(o.offers) ? (o.offers as Nodo[]) : [o]));
  const minCantidad = (o: Nodo) => {
    const q = (o.eligibleQuantity as Nodo | undefined)?.minValue;
    return typeof q === 'number' ? q : Number(q ?? 1) || 1;
  };
  const unitarias = planas.filter((o) => o['@type'] !== 'AggregateOffer').sort((a, b) => minCantidad(a) - minCantidad(b));
  for (const o of unitarias) {
    const p = parsePrecio(o.price as unknown);
    if (p != null) return p;
  }
  for (const o of ofertas) {
    const p = parsePrecio((o.highPrice ?? o.price) as unknown);
    if (p != null) return p;
  }
  return null;
}

export const texto = (v: unknown): string | null => {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
};
