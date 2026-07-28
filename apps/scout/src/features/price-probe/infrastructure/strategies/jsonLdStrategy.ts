import type { Extraction } from '../../domain/models/Extraction';
import type { ExtractionStrategy, StrategyContext } from '../../domain/ports/ExtractionStrategy';
import { parsePrice } from '../../lib/parsePrice';

type Node = Record<string, unknown> & { '@type'?: unknown; '@graph'?: unknown };

function flattenJsonLd(raw: unknown): Node[] {
  const out: Node[] = [];
  const walk = (n: unknown) => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) return n.forEach(walk);
    const node = n as Node;
    out.push(node);
    if (node['@graph']) walk(node['@graph']);
  };
  walk(raw);
  return out;
}

function isType(node: Node, type: string): boolean {
  const t = node['@type'];
  if (Array.isArray(t)) return t.includes(type);
  return t === type;
}

function pickOffer(offers: unknown): Record<string, unknown> | null {
  if (!offers) return null;
  if (Array.isArray(offers)) {
    for (const o of offers) {
      if (o && typeof o === 'object') return o as Record<string, unknown>;
    }
    return null;
  }
  if (typeof offers === 'object') return offers as Record<string, unknown>;
  return null;
}

function toStr(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s || undefined;
}

export const jsonLdStrategy: ExtractionStrategy = {
  name: 'json-ld',
  run(ctx: StrategyContext): Extraction | null {
    const scripts = ctx.$('script[type="application/ld+json"]');
    if (scripts.length === 0) return null;

    const nodes: Node[] = [];
    scripts.each((_i, el) => {
      const text = ctx.$(el).contents().text().trim();
      if (!text) return;
      try {
        nodes.push(...flattenJsonLd(JSON.parse(text)));
      } catch {
        // ignore malformed JSON-LD blocks; try the next
      }
    });

    for (const node of nodes) {
      if (!isType(node, 'Product')) continue;

      const offer = pickOffer(node.offers);
      let precio: number | null = null;
      let precioTachado: number | null = null;
      let moneda = 'EUR';
      let enStock: boolean | undefined;

      if (offer) {
        const isAggregate = offer['@type'] === 'AggregateOffer';
        precio = parsePrice(isAggregate ? offer.lowPrice ?? offer.price : offer.price);
        precioTachado = parsePrice(offer.highPrice ?? (offer as { priceSpecification?: { price?: unknown } }).priceSpecification?.price);
        moneda = toStr(offer.priceCurrency) ?? moneda;
        const av = toStr(offer.availability);
        if (av) enStock = /InStock|LimitedAvailability/i.test(av);
      }

      if (precio == null) continue;

      const ean =
        toStr(node.gtin13) ??
        toStr(node.gtin14) ??
        toStr(node.gtin) ??
        toStr(node.gtin12) ??
        toStr(node.gtin8);
      const sku = toStr(node.sku) ?? toStr(node.mpn);
      const nombre = toStr(node.name);

      return {
        via: 'json-ld',
        precio,
        precioTachado: precioTachado ?? undefined,
        moneda,
        enStock,
        ean,
        sku,
        nombre,
      };
    }

    return null;
  },
};
