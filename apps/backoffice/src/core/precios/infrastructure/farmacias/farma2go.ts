// Farma2go (Shopify). Busca con la API pública de Doofinder (hashid y zona del
// script de configuración que carga su portada), que trae el CN en `mpn` y el
// EAN en `gtin`. La ficha se lee de /products/<handle>.js: por variante, `sku`
// (CN, a veces con la etiqueta interna "C_TOP_") y `barcode` (EAN). Ojo con los
// packs: "ZZZ_176858_6UDS" o "ZZZ_Duplo_<EAN>" llevan el MISMO barcode que la
// unidad, así que en esas variantes el barcode no cuenta.
import type { Producto } from '../../domain/models';
import type { AdaptadorFarmacia, ResultadoFarmacia } from '../../domain/ports';
import { ClienteWeb } from '../web/clienteWeb';
import { texto } from '../web/ficha';
import { NO_ENCONTRADO, comprobarFicha, conErrores, conBusquedaPorNombre, nombreParaBuscar, resultadoDeFicha, type DatosFicha } from './comun';

const HOME = 'https://farma2go.com/';
const web = new ClienteWeb(['farma2go.com', 'doofinder.com']);
const sesion = Math.random().toString(36).slice(2);
let doofinder: { hashid: string; zona: string } | null = null;

interface HitDoofinder {
  id?: string;
  title?: string;
  mpn?: string;
  gtin?: string;
  link?: string;
}

interface VarianteShopify {
  id: number;
  title: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  compare_at_price: number | null;
}

interface ProductoShopify {
  title: string;
  handle: string;
  variants: VarianteShopify[];
}

async function configDoofinder() {
  if (doofinder) return doofinder;
  const home = await web.get(HOME);
  const m = home.body.match(/https:\/\/(\w+)-config\.doofinder\.com\/2\.x\/([0-9a-f-]+)\.js/);
  if (!m) throw new Error('No encuentro la configuración del buscador');
  const cfg = await web.get(m[0], { accept: 'any' });
  const hashid = cfg.body.match(/"hashid"\s*:\s*"([0-9a-f]{32})"/)?.[1];
  if (!hashid) throw new Error('No encuentro el identificador del buscador');
  // La config dice "eu1-b", pero la búsqueda responde en eu1 (la zona de la URL).
  doofinder = { hashid, zona: m[1] };
  return doofinder;
}

async function buscarDoofinder(q: string): Promise<HitDoofinder[]> {
  const { hashid, zona } = await configDoofinder();
  const u = `https://${zona}-search.doofinder.com/6/${hashid}/_search?query=${encodeURIComponent(q)}&rpp=10&page=1&session_id=${sesion}`;
  const j = await web.json<{ results?: HitDoofinder[] }>(u, { headers: { origin: 'https://farma2go.com', referer: HOME } });
  return (j.results ?? []).filter((h) => h.link?.includes('/products/'));
}

const PACK = /^ZZZ_|pack|duplo|triplo|\d\s*uds?\b|_promo/i;

/** Lo que muestra una variante. En un pack solo cuenta su sku (que ya delata el pack). */
function codigosVariante(sku: string | null | undefined, barcode: string | null | undefined) {
  const s = texto(sku);
  if (s && PACK.test(s)) return { codigos: [s], ean: null };
  return { codigos: [s?.replace(/^C_TOP_/, '').replace(/_NUEVO$/, '')], ean: texto(barcode) };
}

async function leerFichas(link: string): Promise<DatosFicha[]> {
  const u = new URL(link);
  const r = await web.get(`https://${u.host}${u.pathname}.js`, { accept: 'json' });
  if (r.status !== 200) return [];
  const prod = JSON.parse(r.body) as ProductoShopify;
  const varias = prod.variants.length > 1;
  return prod.variants.map((v) => ({
    url: `https://farma2go.com/products/${prod.handle}${varias ? `?variant=${v.id}` : ''}`,
    // Shopify da los precios en céntimos.
    precio: v.price ? v.price / 100 : null,
    precioAntes: v.compare_at_price ? v.compare_at_price / 100 : null,
    nombre: texto(varias ? `${prod.title} - ${v.title}` : prod.title),
    ...codigosVariante(v.sku, v.barcode),
  }));
}

async function buscar(p: Producto): Promise<ResultadoFarmacia> {
  const vias = [p.cn, ...(p.ean ? [p.ean] : []), ...(conBusquedaPorNombre() ? [nombreParaBuscar(p.nombre)] : [])];
  const abiertas = new Set<string>();
  let primera: ResultadoFarmacia | null = null;
  for (const q of vias) {
    // Solo se abren fichas cuyo código en Doofinder no sea claramente otro producto.
    const hits = (await buscarDoofinder(q)).filter((h) => {
      const d = { url: '', precio: null, precioAntes: null, nombre: null, ...codigosVariante(h.mpn, h.gtin) };
      return comprobarFicha(p, d) !== 'distinto';
    });
    for (const h of hits.slice(0, 3)) {
      const link = h.link!.trim().split('?')[0];
      if (abiertas.has(link)) continue;
      abiertas.add(link);
      const fichas = await leerFichas(link);
      const ok = fichas.find((f) => comprobarFicha(p, f) === 'verificado');
      if (ok) return resultadoDeFicha(p, ok, q === p.cn ? undefined : 'encontrado por EAN o por nombre');
      const f = fichas.find((x) => x.url.endsWith(`=${h.id}`)) ?? fichas[0];
      if (f && !primera) primera = resultadoDeFicha(p, f);
    }
  }
  return primera ?? NO_ENCONTRADO;
}

export const farma2go: AdaptadorFarmacia = {
  clave: 'farma2go',
  nombre: 'Farma2go',
  buscar: (p) => conErrores(() => buscar(p)),
};
