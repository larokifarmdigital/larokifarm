import type { Extraction } from '../../domain/models/Extraction';
import type { ExtractionStrategy, StrategyContext } from '../../domain/ports/ExtractionStrategy';
import { parsePrice } from '../../lib/parsePrice';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

type PrestashopAjaxResponse = {
  product?: {
    price_amount?: number | string;
    regular_price_amount?: number | string;
    reference?: string;
    ean13?: string;
    name?: string;
    id?: number;
  };
};

function looksLikePrestashop(html: string): boolean {
  return /prestashop|prestashop-ajax|Prestashop/i.test(html);
}

function toAjaxUrl(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set('ajax', '1');
    return u.toString();
  } catch {
    return url;
  }
}

export const prestashopStrategy: ExtractionStrategy = {
  name: 'prestashop-ajax',
  async run(ctx: StrategyContext): Promise<Extraction | null> {
    if (!looksLikePrestashop(ctx.html)) return null;

    const ajaxUrl = toAjaxUrl(ctx.url);

    let data: PrestashopAjaxResponse;
    try {
      const res = await fetch(ajaxUrl, {
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
        headers: {
          'User-Agent': UA,
          Accept: 'application/json,text/javascript,*/*;q=0.1',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      if (!res.ok) return null;
      const contentType = res.headers.get('content-type') ?? '';
      if (!/json/i.test(contentType)) return null;
      data = (await res.json()) as PrestashopAjaxResponse;
    } catch {
      return null;
    }

    const p = data.product;
    if (!p) return null;

    const precio = parsePrice(p.price_amount);
    if (precio == null) return null;

    const precioTachado = parsePrice(p.regular_price_amount) ?? undefined;

    return {
      via: 'prestashop-ajax',
      precio,
      precioTachado: precioTachado && precioTachado > precio ? precioTachado : undefined,
      moneda: 'EUR',
      ean: p.ean13 || undefined,
      sku: p.reference || undefined,
      nombre: p.name,
    };
  },
};
