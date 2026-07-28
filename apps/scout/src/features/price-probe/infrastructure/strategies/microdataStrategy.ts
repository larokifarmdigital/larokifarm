import type { Extraction } from '../../domain/models/Extraction';
import type { ExtractionStrategy, StrategyContext } from '../../domain/ports/ExtractionStrategy';
import { parsePrice } from '../../lib/parsePrice';

export const microdataStrategy: ExtractionStrategy = {
  name: 'microdata',
  run(ctx: StrategyContext): Extraction | null {
    const $ = ctx.$;
    const priceEl = $('[itemprop="price"]').first();
    if (priceEl.length === 0) return null;

    const raw = priceEl.attr('content') ?? priceEl.text();
    const precio = parsePrice(raw);
    if (precio == null) return null;

    const currencyEl = $('[itemprop="priceCurrency"]').first();
    const moneda = (currencyEl.attr('content') ?? currencyEl.text().trim()) || 'EUR';

    const nombre =
      $('[itemprop="name"]').first().text().trim() ||
      $('title').first().text().trim() ||
      undefined;

    const availabilityEl = $('[itemprop="availability"]').first();
    const availabilityRaw = availabilityEl.attr('href') ?? availabilityEl.attr('content') ?? '';
    const enStock = availabilityRaw
      ? /InStock|LimitedAvailability/i.test(availabilityRaw)
      : undefined;

    return {
      via: 'microdata',
      precio,
      moneda,
      nombre,
      enStock,
    };
  },
};
