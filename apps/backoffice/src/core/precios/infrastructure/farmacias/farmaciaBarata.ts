// Farmacia Barata (PrestaShop tras Cloudflare). La página /busqueda tiene reto,
// pero el ajax de su propia barra de búsqueda (is_searchbar) y las fichas no.
// Busca por CN; la ficha trae JSON-LD sku = CN y gtin13 = EAN.
import * as cheerio from 'cheerio';
import type { Producto } from '../../domain/models';
import type { AdaptadorFarmacia, ResultadoFarmacia } from '../../domain/ports';
import { parsePrecio } from '../../domain/codigos';
import { ClienteWeb } from '../web/clienteWeb';
import { precioUnidad, productoJsonLd, texto } from '../web/ficha';
import { NO_ENCONTRADO, comprobarFicha, conErrores, nombreParaBuscar, resultadoDeFicha, type DatosFicha } from './comun';

const BASE = 'https://www.farmaciabarata.es';
const web = new ClienteWeb(['farmaciabarata.es']);

async function buscarAjax(q: string): Promise<string[]> {
  const j = await web.json<{ content?: string }>(`${BASE}/module/is_searchbar/ajaxSearch?ajax=1&s=${encodeURIComponent(q)}`, {
    headers: { 'x-requested-with': 'XMLHttpRequest' },
  });
  const $ = cheerio.load(j.content ?? '');
  return [...new Set($('a.product-miniature__name-link').map((_, e) => $(e).attr('href')).get())].filter(Boolean);
}

async function leerFicha(url: string): Promise<DatosFicha | null> {
  // Con Accept JSON PrestaShop no devuelve el HTML de la ficha: siempre HTML.
  const r = await web.get(url);
  if (r.status !== 200) return null;
  const $ = cheerio.load(r.body);
  const prod = productoJsonLd(r.body);
  return {
    url: r.url,
    precio: precioUnidad(prod) ?? parsePrecio($('meta[property="product:price:amount"]').attr('content')),
    precioAntes: parsePrecio($('meta[property="product:price:standard_amount"]').attr('content')),
    nombre: texto(prod?.name) ?? texto($('h1').first().text()),
    codigos: [texto(prod?.sku)],
    ean: texto(prod?.gtin13),
  };
}

async function buscar(p: Producto): Promise<ResultadoFarmacia> {
  const vias: string[] = [p.cn, ...(p.ean ? [p.ean] : []), ...(p.tipo === 'parafarmacia' ? [nombreParaBuscar(p.nombre)] : [])];
  let sinCodigo: ResultadoFarmacia | null = null;
  for (const [i, q] of vias.entries()) {
    const urls = await buscarAjax(q);
    for (const url of urls.slice(0, 3)) {
      const f = await leerFicha(url);
      if (!f) continue;
      const c = comprobarFicha(p, f);
      if (c === 'verificado') return resultadoDeFicha(p, f);
      if (c === 'sin_codigo' && !sinCodigo) sinCodigo = resultadoDeFicha(p, f, 'la ficha no muestra CN ni EAN');
    }
    // El buscador encontró algo por código: no seguir con vías más débiles.
    if (urls.length && i < vias.length - 1 && q !== nombreParaBuscar(p.nombre)) break;
  }
  return sinCodigo ?? NO_ENCONTRADO;
}

export const farmaciaBarata: AdaptadorFarmacia = {
  clave: 'farmaciabarata',
  nombre: 'Farmacia Barata',
  buscar: (p) => conErrores(() => buscar(p)),
};
