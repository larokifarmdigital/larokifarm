export type StrategyName =
  | 'json-ld'
  | 'og-meta'
  | 'microdata'
  | 'shopify-js'
  | 'prestashop-ajax';

export type Extraction = {
  via: StrategyName;
  precio: number;
  precioTachado?: number;
  moneda: string;
  enStock?: boolean;
  ean?: string;
  sku?: string;
  nombre?: string;
};

export type ProbeFailure = {
  kind: 'network' | 'http' | 'antibot' | 'no-data';
  message: string;
  status?: number;
  teniaJsonLd?: boolean;
};

export type ProbeResult =
  | { ok: true; url: string; ms: number; data: Extraction }
  | { ok: false; url: string; ms: number; error: ProbeFailure };
