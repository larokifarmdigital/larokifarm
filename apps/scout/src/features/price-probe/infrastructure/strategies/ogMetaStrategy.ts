import type { Extraction } from '../../domain/models/Extraction';
import type { ExtractionStrategy, StrategyContext } from '../../domain/ports/ExtractionStrategy';
import { parsePrice } from '../../lib/parsePrice';

export const ogMetaStrategy: ExtractionStrategy = {
  name: 'og-meta',
  run(ctx: StrategyContext): Extraction | null {
    const $ = ctx.$;

    const rawPrice =
      $('meta[property="product:price:amount"]').attr('content') ??
      $('meta[property="og:price:amount"]').attr('content') ??
      $('meta[itemprop="price"]').attr('content');

    const precio = parsePrice(rawPrice);
    if (precio == null) return null;

    const moneda =
      $('meta[property="product:price:currency"]').attr('content') ??
      $('meta[property="og:price:currency"]').attr('content') ??
      $('meta[itemprop="priceCurrency"]').attr('content') ??
      'EUR';

    const nombre =
      $('meta[property="og:title"]').attr('content') ??
      $('meta[name="twitter:title"]').attr('content') ??
      ($('title').first().text().trim() || undefined);

    return {
      via: 'og-meta',
      precio,
      moneda,
      nombre,
    };
  },
};
