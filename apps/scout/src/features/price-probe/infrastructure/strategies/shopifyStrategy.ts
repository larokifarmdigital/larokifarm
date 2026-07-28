import type { Extraction } from '../../domain/models/Extraction';
import type { ExtractionStrategy, StrategyContext } from '../../domain/ports/ExtractionStrategy';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

type ShopifyVariant = {
  price?: number | string;
  compare_at_price?: number | string | null;
  sku?: string | null;
  barcode?: string | null;
  available?: boolean;
};

type ShopifyProduct = {
  title?: string;
  variants?: ShopifyVariant[];
};

function looksLikeShopify(html: string): boolean {
  return /cdn\/shop\/|Shopify\.theme|shopify/i.test(html);
}

function toProductJsonUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!/\/products\/[^/]+/.test(u.pathname)) return null;
    u.search = '';
    u.hash = '';
    if (!u.pathname.endsWith('.js')) u.pathname = u.pathname.replace(/\/$/, '') + '.js';
    return u.toString();
  } catch {
    return null;
  }
}

export const shopifyStrategy: ExtractionStrategy = {
  name: 'shopify-js',
  async run(ctx: StrategyContext): Promise<Extraction | null> {
    if (!looksLikeShopify(ctx.html)) return null;

    const jsonUrl = toProductJsonUrl(ctx.url);
    if (!jsonUrl) return null;

    let data: ShopifyProduct;
    try {
      const res = await fetch(jsonUrl, {
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
        headers: { 'User-Agent': UA, Accept: 'application/json' },
      });
      if (!res.ok) return null;
      data = (await res.json()) as ShopifyProduct;
    } catch {
      return null;
    }

    const v = data.variants?.[0];
    if (!v) return null;

    const rawPrice = typeof v.price === 'string' ? parseFloat(v.price) : v.price;
    if (rawPrice == null || !Number.isFinite(rawPrice)) return null;

    const precio = rawPrice / 100;
    const rawCompare =
      typeof v.compare_at_price === 'string' ? parseFloat(v.compare_at_price) : v.compare_at_price;
    const precioTachado =
      rawCompare != null && Number.isFinite(rawCompare) && rawCompare > 0
        ? rawCompare / 100
        : undefined;

    return {
      via: 'shopify-js',
      precio,
      precioTachado,
      moneda: 'EUR',
      enStock: v.available,
      ean: v.barcode ?? undefined,
      sku: v.sku ?? undefined,
      nombre: data.title,
    };
  },
};
