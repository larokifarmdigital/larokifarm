// Comparador contra Google Shopping vía ScraperAPI. Con SCRAPERAPI_KEY='MOCK'
// devuelve datos ficticios deterministas por CN (útil para tests sin coste).

export interface FarmaciaPrecio {
  nombre: string;
  precio: number;
  url: string;
  tituloEncontrado: string;
}

export interface ProductoComparado {
  farmacias: FarmaciaPrecio[];
  resumen: {
    min: number;
    max: number;
    medio: number;
  } | null;
  mejorFarmacia: FarmaciaPrecio | null;
  notas: string;
}

export interface ScraperConfig {
  scraperApiKey: string;
  /** Timeout por request en ms (default 30000). */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT = 30_000;

export async function compararProducto(
  producto: { cn: string; ean: string; nombre: string },
  cfg: ScraperConfig,
): Promise<ProductoComparado> {
  if (!cfg.scraperApiKey || cfg.scraperApiKey === 'MOCK') {
    return mockCompararProducto(producto);
  }
  return realCompararProducto(producto, cfg);
}

// Precios ficticios deterministas: mismo CN devuelve siempre el mismo precio.
function mockCompararProducto(producto: {
  cn: string;
  nombre: string;
}): ProductoComparado {
  const seed = Array.from(producto.cn).reduce((s, c) => s + c.charCodeAt(0), 0);
  const base = 3 + (seed % 15);

  const farmacias: FarmaciaPrecio[] = [
    {
      nombre: 'Atida (MOCK)',
      precio: round2(base + 0.5),
      url: `https://www.atida.com/es-es/producto/${producto.cn}`,
      tituloEncontrado: `${producto.nombre} — Atida`,
    },
    {
      nombre: 'DosFarma (MOCK)',
      precio: round2(base + 1.2),
      url: `https://www.dosfarma.com/producto/${producto.cn}`,
      tituloEncontrado: `${producto.nombre} — DosFarma`,
    },
    {
      nombre: 'Farmacia Ribera (MOCK)',
      precio: round2(base - 0.15),
      url: `https://farmaciaribera.es/${producto.cn}`,
      tituloEncontrado: `${producto.nombre} — Ribera`,
    },
  ];

  return construirResultado(farmacias, 'Datos MOCK (desarrollo)');
}

interface ScraperShoppingItem {
  title?: string;
  price?: string;
  price_value?: number;
  seller?: string;
  merchant?: string;
  link?: string;
  url?: string;
  product_link?: string;
}

interface ScraperShoppingResponse {
  shopping_results?: ScraperShoppingItem[];
  organic_results?: ScraperShoppingItem[];
}

async function realCompararProducto(
  producto: { cn: string; ean: string; nombre: string },
  cfg: ScraperConfig,
): Promise<ProductoComparado> {
  const query = buildQuery(producto);
  const url = new URL('https://api.scraperapi.com/structured/google/shopping');
  url.searchParams.set('api_key', cfg.scraperApiKey);
  url.searchParams.set('query', query);
  url.searchParams.set('country_code', 'es');
  url.searchParams.set('tld', 'es');

  const timeoutMs = cfg.timeoutMs ?? DEFAULT_TIMEOUT;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(url.toString(), { signal: ctrl.signal });
    if (!res.ok) {
      return construirResultado([], `ScraperAPI HTTP ${res.status}`);
    }
    const data = (await res.json()) as ScraperShoppingResponse;
    const items = data.shopping_results ?? data.organic_results ?? [];

    const farmacias = items
      .map((it) => normalizarResultado(it))
      .filter((f): f is FarmaciaPrecio => f !== null)
      .filter((f) => coincideConProducto(f.tituloEncontrado, producto.nombre));

    if (farmacias.length === 0) {
      return construirResultado([], 'Sin resultados que coincidan con el título');
    }
    return construirResultado(farmacias, farmacias.length === 1 ? '1 solo resultado' : '');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return construirResultado([], `Error: ${msg}`);
  } finally {
    clearTimeout(timer);
  }
}

function buildQuery(producto: { cn: string; ean: string; nombre: string }): string {
  // EAN suma discriminación si existe.
  const partes = [producto.nombre];
  if (producto.ean) partes.push(producto.ean);
  return partes.join(' ').trim();
}

function normalizarResultado(it: ScraperShoppingItem): FarmaciaPrecio | null {
  const titulo = it.title?.trim();
  if (!titulo) return null;

  const precio = extraerPrecio(it);
  if (precio == null || precio <= 0 || precio > 500) return null;

  const merchant = (it.seller ?? it.merchant ?? '').trim();
  if (!merchant) return null;

  // NOTE: descartamos it.link · es un aclk (ad-click tracker) de Google que caduca
  // en días. Construimos una URL de Google Search restringida a la tienda: estable
  // y siempre lleva a la ficha real como primer resultado orgánico.
  const url = buildStoreSearchUrl(titulo, merchant);

  return {
    nombre: merchant,
    precio: round2(precio),
    url,
    tituloEncontrado: titulo,
  };
}

function buildStoreSearchUrl(titulo: string, source: string): string {
  const cleanTitle = titulo.replace(/"/g, '').trim();
  const q = looksLikeDomain(source)
    ? `"${cleanTitle}" site:${source}`
    : `"${cleanTitle}" "${source}"`;
  return `https://www.google.com/search?q=${encodeURIComponent(q)}&gl=es&hl=es`;
}

function looksLikeDomain(source: string): boolean {
  return /^[a-z0-9-]+(\.[a-z]{2,})+$/i.test(source.trim());
}

function extraerPrecio(it: ScraperShoppingItem): number | null {
  if (typeof it.price_value === 'number') return it.price_value;
  if (!it.price) return null;
  // Acepta "4,95 €", "€4.95", "EUR 4.95".
  const cleaned = it.price
    .replace(/[€$£¥]/g, '')
    .replace(/EUR|USD|GBP/gi, '')
    .replace(/\./g, '')
    .replace(/,/g, '.')
    .trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

// Coincidencia estricta: al menos el 50% de las palabras significativas (>2 letras)
// del nombre esperado debe aparecer en el título encontrado.
function coincideConProducto(tituloEncontrado: string, nombreEsperado: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2);

  const esperadas = norm(nombreEsperado);
  const encontradas = new Set(norm(tituloEncontrado));

  if (esperadas.length === 0) return true;

  const matches = esperadas.filter((w) => encontradas.has(w)).length;
  return matches / esperadas.length >= 0.5;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function construirResultado(
  farmacias: FarmaciaPrecio[],
  notas: string,
): ProductoComparado {
  if (farmacias.length === 0) {
    return { farmacias: [], resumen: null, mejorFarmacia: null, notas };
  }
  const precios = farmacias.map((f) => f.precio);
  const min = Math.min(...precios);
  const max = Math.max(...precios);
  const medio = round2(precios.reduce((a, b) => a + b, 0) / precios.length);
  const mejorFarmacia = farmacias.reduce((best, f) => (f.precio < best.precio ? f : best));
  return {
    farmacias,
    resumen: { min: round2(min), max: round2(max), medio },
    mejorFarmacia,
    notas,
  };
}
