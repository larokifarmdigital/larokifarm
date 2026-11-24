// Tedín (tedin.com, antes farmaciatedin.es; PrestaShop 1.7). Busca con la API
// pública de Doofinder (hashid y zona del script de configuración que carga su
// portada), que trae el CN en `reference`. La ficha trae JSON-LD sku = mpn = CN
// y gtin13 = EAN. Ojo: algunas referencias son internas ("006701"), no CN.
// No vende medicamentos.
import * as cheerio from 'cheerio';
import type { Producto } from '../../domain/models';
import type { AdaptadorFarmacia, ResultadoFarmacia } from '../../domain/ports';
import { parsePrecio } from '../../domain/codigos';
import { ClienteWeb } from '../web/clienteWeb';
import { precioUnidad, productoJsonLd, texto } from '../web/ficha';
import { NO_ENCONTRADO, comprobarFicha, conErrores, nombreParaBuscar, resultadoDeFicha, type DatosFicha } from './comun';

const HOME = 'https://www.tedin.com/';
const web = new ClienteWeb(['tedin.com', 'doofinder.com']);
const sesion = Math.random().toString(36).slice(2);
let doofinder: { hashid: string; zona: string } | null = null;

interface HitDoofinder {
  reference?: string;
  mpn?: string;
  link?: string;
}

async function configDoofinder() {
  if (doofinder) return doofinder;
  const home = await web.get(HOME);
  const m = home.body.match(/https:\/\/(\w+)-config\.doofinder\.com\/2\.x\/([0-9a-f-]+)\.js/);
  if (!m) throw new Error('No encuentro la configuración del buscador');
  const cfg = await web.get(m[0], { accept: 'any' });
  const hashid = cfg.body.match(/"hashid"\s*:\s*"([0-9a-f]{32})"/)?.[1];
  if (!hashid) throw new Error('No encuentro el identificador del buscador');
  doofinder = { hashid, zona: m[1] };
  return doofinder;
}

async function buscarDoofinder(q: string): Promise<HitDoofinder[]> {
  const { hashid, zona } = await configDoofinder();
  const u = `https://${zona}-search.doofinder.com/6/${hashid}/_search?query=${encodeURIComponent(q)}&rpp=10&page=1&session_id=${sesion}`;
  const j = await web.json<{ results?: HitDoofinder[] }>(u, { headers: { origin: 'https://www.tedin.com', referer: HOME } });
  return (j.results ?? []).filter((h) => h.link);
}

async function leerFicha(url: string): Promise<DatosFicha | null> {
  const r = await web.get(url);
  if (r.status !== 200) return null;
  const $ = cheerio.load(r.body);
  const prod = productoJsonLd(r.body);
  // El primer bloque de precio es el del producto (los relacionados van después).
  const bloque = $('.product-prices').first();
  return {
    url: r.url,
    precio: precioUnidad(prod) ?? parsePrecio(bloque.find('.current-price-value').attr('content')),
    precioAntes: parsePrecio(bloque.find('.regular-price').first().text()),
    nombre: texto(prod?.name) ?? texto($('h1').first().text()),
    codigos: [texto(prod?.sku), texto(prod?.mpn)],
    ean: texto(prod?.gtin13),
  };
}

async function buscar(p: Producto): Promise<ResultadoFarmacia> {
  if (p.tipo !== 'parafarmacia') return { ...NO_ENCONTRADO, nota: 'no vende medicamentos' };
  const vias = [p.cn, ...(p.ean ? [p.ean] : []), nombreParaBuscar(p.nombre)];
  const abiertas = new Set<string>();
  let primera: ResultadoFarmacia | null = null;
  for (const q of vias) {
    // El buscador es difuso (un CN sin ficha devuelve cualquier cosa): solo se
    // abren fichas cuyo código en Doofinder no sea claramente otro producto.
    const hits = (await buscarDoofinder(q)).filter(
      (h) => comprobarFicha(p, { url: '', precio: null, precioAntes: null, nombre: null, codigos: [h.reference, h.mpn], ean: null }) !== 'distinto',
    );
    for (const h of hits.slice(0, 3)) {
      const link = h.link!.trim();
      if (abiertas.has(link)) continue;
      abiertas.add(link);
      const f = await leerFicha(link);
      if (!f) continue;
      if (comprobarFicha(p, f) === 'verificado') return resultadoDeFicha(p, f, q === p.cn ? undefined : 'encontrado por EAN o por nombre');
      primera ??= resultadoDeFicha(p, f);
    }
  }
  return primera ?? NO_ENCONTRADO;
}

export const tedin: AdaptadorFarmacia = {
  clave: 'tedin',
  nombre: 'Tedín',
  soloParafarmacia: true,
  buscar: (p) => conErrores(() => buscar(p)),
};
