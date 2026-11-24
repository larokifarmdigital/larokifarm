// Farmacia Market (PrestaShop 1.7). Busca con el buscador nativo en JSON
// (/busqueda?s=<q>&ajax=1), muy difuso: con un CN devuelve referencias
// parecidas, así que solo se abre la ficha cuyo `reference` es nuestro CN. La
// ficha muestra "CN: <CN>" y el data-product (meta) trae reference, pack y
// precio; su JSON-LD suele estar mal formado. Ojo: "165892.1" es un DUPLO, no
// el CN con control. No vende medicamentos sin receta.
import * as cheerio from 'cheerio';
import type { Producto } from '../../domain/models';
import type { AdaptadorFarmacia, ResultadoFarmacia } from '../../domain/ports';
import { cnDeCodigo, eanDeCn, parsePrecio } from '../../domain/codigos';
import { ClienteWeb } from '../web/clienteWeb';
import { precioUnidad, productoJsonLd, texto } from '../web/ficha';
import { NO_ENCONTRADO, conErrores, nombreParaBuscar, resultadoDeFicha, type DatosFicha } from './comun';

const BASE = 'https://www.farmaciamarket.es';
const web = new ClienteWeb(['farmaciamarket.es']);

interface HitPresta {
  reference?: string | null;
  url?: string;
}

/** "217558.7" es el CN con control; "165892.1" (control ≠ 1) es un pack o variante. */
function referencia(ref: unknown): string | null {
  const t = texto(ref);
  const m = t?.match(/^(\d{6})\.?(\d)$/);
  return m && eanDeCn(m[1]).slice(-1) !== m[2] ? `${m[1]}-${m[2]}` : t;
}

async function buscador(q: string): Promise<HitPresta[]> {
  const j = await web.json<{ products?: HitPresta[] }>(
    `${BASE}/busqueda?s=${encodeURIComponent(q)}&ajax=1&resultsPerPage=20`,
    { headers: { 'x-requested-with': 'XMLHttpRequest' } },
  );
  return j.products ?? [];
}

async function leerFicha(url: string): Promise<DatosFicha | null> {
  const r = await web.get(url);
  if (r.status !== 200) return null;
  const $ = cheerio.load(r.body);
  const prod = productoJsonLd(r.body);
  let dp: Record<string, unknown> = {};
  try {
    dp = JSON.parse($('meta[data-product]').first().attr('data-product') ?? '{}') as Record<string, unknown>;
  } catch {
    // sin data-product: quedan el texto visible y el JSON-LD
  }
  const ref = referencia(dp.reference);
  return {
    url: r.url,
    precio: parsePrecio(dp.price_amount) ?? precioUnidad(prod),
    precioAntes: dp.has_discount ? parsePrecio(dp.price_without_reduction) : null,
    nombre: texto(dp.name) ?? texto(prod?.name) ?? texto($('h1').first().text()),
    codigos: [
      Number(dp.pack) === 1 ? `pack ${ref}` : ref,
      referencia($('.product-reference > span').first().text()),
      referencia(prod?.sku),
    ],
    ean: texto(dp.ean13) ?? texto(prod?.gtin13),
  };
}

async function buscar(p: Producto): Promise<ResultadoFarmacia> {
  if (p.tipo !== 'parafarmacia') return { ...NO_ENCONTRADO, nota: 'no vende medicamentos' };
  const esCn = (h: HitPresta) => cnDeCodigo(referencia(h.reference)) === p.cn;
  let hit = (await buscador(p.cn)).find(esCn);
  let nota: string | undefined;
  if (!hit) {
    hit = (await buscador(nombreParaBuscar(p.nombre).split(' ').slice(0, 3).join(' '))).find(esCn);
    nota = 'encontrado por nombre';
  }
  if (!hit?.url) return NO_ENCONTRADO;
  const f = await leerFicha(hit.url);
  return f ? resultadoDeFicha(p, f, nota) : NO_ENCONTRADO;
}

export const farmaciaMarket: AdaptadorFarmacia = {
  clave: 'farmaciamarket',
  nombre: 'Farmacia Market',
  soloParafarmacia: true,
  buscar: (p) => conErrores(() => buscar(p)),
};
