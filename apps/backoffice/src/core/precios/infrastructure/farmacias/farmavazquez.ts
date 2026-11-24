// Farmavázquez (PrestaShop 1.6; la primera visita es un 307 que pone una
// cookie). Busca con la API pública de Doofinder, cuyo hashid y zona salen del
// script de configuración que carga su portada. Doofinder devuelve el CN en
// `reference`, así que también sirve de catálogo de parafarmacia por nombre.
// Los medicamentos están en farma-vazquez.com (con guion).
import * as cheerio from 'cheerio';
import type { Candidato, Producto } from '../../domain/models';
import type { AdaptadorFarmacia, CatalogoParafarmacia, ResultadoFarmacia } from '../../domain/ports';
import { cnDeCodigo, parsePrecio } from '../../domain/codigos';
import { ClienteWeb } from '../web/clienteWeb';
import { texto } from '../web/ficha';
import { NO_ENCONTRADO, comprobarFicha, conErrores, conBusquedaPorNombre, nombreParaBuscar, resultadoDeFicha, type DatosFicha } from './comun';

const HOME = 'https://www.farmavazquez.com/';
const web = new ClienteWeb(['farmavazquez.com', 'farma-vazquez.com', 'doofinder.com']);
const sesion = Math.random().toString(36).slice(2);
let doofinder: { hashid: string; zona: string } | null = null;

interface HitDoofinder {
  title?: string;
  reference?: string;
  mpn?: string;
  link?: string;
  price?: number;
}

async function configDoofinder() {
  if (doofinder) return doofinder;
  const home = await web.get(HOME);
  const m = home.body.match(/https:\/\/(\w+)-config\.doofinder\.com\/2\.x\/([0-9a-f-]+)\.js/);
  if (!m) throw new Error('No encuentro la configuración del buscador');
  const cfg = await web.get(m[0], { accept: 'any' });
  const hashid = cfg.body.match(/"hashid"\s*:\s*"([0-9a-f]{32})"/)?.[1];
  if (!hashid) throw new Error('No encuentro el identificador del buscador');
  doofinder = { hashid, zona: cfg.body.match(/"zone"\s*:\s*"(\w+)"/)?.[1] ?? m[1] };
  return doofinder;
}

async function buscarDoofinder(q: string): Promise<HitDoofinder[]> {
  const { hashid, zona } = await configDoofinder();
  const u = `https://${zona}-search.doofinder.com/6/${hashid}/_search?query=${encodeURIComponent(q)}&rpp=10&page=1&session_id=${sesion}`;
  const j = await web.json<{ results?: HitDoofinder[] }>(u, { headers: { origin: 'https://www.farmavazquez.com', referer: HOME } });
  return j.results ?? [];
}

const cnDeHit = (h: HitDoofinder) => cnDeCodigo(h.reference) ?? cnDeCodigo(h.mpn);

async function leerFicha(url: string): Promise<DatosFicha | null> {
  const r = await web.get(url);
  if (r.status !== 200) return null;
  const $ = cheerio.load(r.body);
  const ref =
    $('#product_reference .editable').first().text().trim() ||
    r.body.match(/var productReference\s*=\s*'([^']*)'/)?.[1] ||
    $('[itemprop="sku"]').first().text().trim();
  // El mpn del JSON-LD de farma-vazquez.com es un id interno, no el CN: no se usa.
  const ean = r.body.match(/"gtin13"\s*:\s*"(\d{13})"|itemprop="gtin13"\s+content="(\d{13})"/);
  // El canonical a veces es basura ("1"): solo si es una URL de la propia web.
  const can = ($('link[rel="canonical"]').attr('href') ?? '').trim();
  return {
    url: /^https:\/\/www\.farma-?vazquez\.com\/.+\.html$/.test(can) ? can : r.url,
    precio:
      parsePrecio($('#our_price_display').first().text()) ??
      parsePrecio($('meta[itemprop="price"]').attr('content')) ??
      parsePrecio(r.body.match(/var productPrice\s*=\s*'?([\d.]+)/)?.[1]),
    precioAntes: parsePrecio($('#old_price_display').first().text()),
    nombre: texto($('h1').first().text()),
    codigos: [ref],
    ean: ean ? (ean[1] ?? ean[2]) : null,
  };
}

async function buscar(p: Producto): Promise<ResultadoFarmacia> {
  // Por EAN Doofinder no devuelve nada en esta web: CN y, si no, nombre.
  const hit = (await buscarDoofinder(p.cn)).find((h) => cnDeHit(h) === p.cn);
  if (hit?.link) {
    const f = await leerFicha(hit.link.trim());
    // Doofinder puede traer el precio sin el descuento del día: manda la ficha.
    if (f) return resultadoDeFicha(p, f);
  }
  if (!conBusquedaPorNombre()) return NO_ENCONTRADO;
  for (const h of (await buscarDoofinder(nombreParaBuscar(p.nombre))).slice(0, 3)) {
    if (!h.link) continue;
    const f = await leerFicha(h.link.trim());
    if (f && comprobarFicha(p, f) === 'verificado') return resultadoDeFicha(p, f, 'encontrado por nombre');
  }
  return NO_ENCONTRADO;
}

export const farmavazquez: AdaptadorFarmacia = {
  clave: 'farmavazquez',
  nombre: 'Farmavázquez',
  buscar: (p) => conErrores(() => buscar(p)),
};

/** Catálogo por nombre/CN para parafarmacia (CIMA no la tiene). */
export const catalogoFarmavazquez: CatalogoParafarmacia = {
  async porCn(cn) {
    const hit = (await buscarDoofinder(cn)).find((h) => cnDeHit(h) === cn);
    return hit?.title ? { nombre: hit.title.trim() } : null;
  },
  async porNombre(textoBuscado) {
    const hits = await buscarDoofinder(textoBuscado);
    const vistos = new Set<string>();
    const out: Candidato[] = [];
    for (const h of hits) {
      const cn = cnDeHit(h);
      if (!cn || !h.title || vistos.has(cn)) continue;
      vistos.add(cn);
      // Orientativo: los medicamentos viven en farma-vazquez.com.
      const tipo = /farma-vazquez\.com/.test(h.link ?? '') ? 'sin_receta' : 'parafarmacia';
      out.push({ cn, nombre: h.title.trim(), tipo });
    }
    return out;
  },
};
