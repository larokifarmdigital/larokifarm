// Farmacia Jiménez (plataforma propia, Laravel + Vue). Su buscador llama a
// /busqueda/catalogo?q=&c=parafarmacia|msr (JSON); el campo `sku` es el CN y el
// EAN no está indexado. "msr" = medicamentos sin receta. La ficha trae JSON-LD
// sku/mpn = CN y meta product:retailer_item_id.
import * as cheerio from 'cheerio';
import type { Producto } from '../../domain/models';
import type { AdaptadorFarmacia, ResultadoFarmacia } from '../../domain/ports';
import { cnDeCodigo } from '../../domain/codigos';
import { ClienteWeb } from '../web/clienteWeb';
import { precioUnidad, productoJsonLd, texto } from '../web/ficha';
import { NO_ENCONTRADO, conErrores, conBusquedaPorNombre, nombreParaBuscar, resultadoDeFicha, type DatosFicha } from './comun';

const BASE = 'https://farmaciajimenez.com';
const web = new ClienteWeb(['farmaciajimenez.com']);

interface HitJimenez {
  sku?: string;
  url?: string;
  canonical?: string;
  slug?: string;
}

async function catalogo(q: string, c: 'parafarmacia' | 'msr'): Promise<HitJimenez[]> {
  const j = await web.json<{ data?: HitJimenez[] }>(`${BASE}/busqueda/catalogo?q=${encodeURIComponent(q)}&c=${c}&p=1`, {
    headers: { 'x-requested-with': 'XMLHttpRequest' },
  });
  return j.data ?? [];
}

async function leerFicha(url: string): Promise<DatosFicha | null> {
  const r = await web.get(url);
  if (r.status !== 200) return null;
  const $ = cheerio.load(r.body);
  const prod = productoJsonLd(r.body);
  const oferta = [prod?.offers].flat()[0] as Record<string, unknown> | undefined;
  return {
    url: r.url,
    precio: precioUnidad(prod),
    precioAntes: null,
    nombre: texto(prod?.name) ?? texto($('h1').first().text()),
    codigos: [texto(prod?.sku ?? oferta?.sku), texto(prod?.mpn), texto($('meta[property="product:retailer_item_id"]').attr('content'))],
    ean: texto(prod?.gtin13),
  };
}

async function buscar(p: Producto): Promise<ResultadoFarmacia> {
  const cats: ('parafarmacia' | 'msr')[] = p.tipo === 'sin_receta' ? ['msr', 'parafarmacia'] : ['parafarmacia', 'msr'];
  let hit: HitJimenez | undefined;
  for (const c of cats) {
    hit = (await catalogo(p.cn, c)).find((h) => cnDeCodigo(h.sku) === p.cn);
    if (hit) break;
  }
  // Por nombre solo vale un resultado cuyo sku sea exactamente el CN.
  if (!hit && conBusquedaPorNombre()) hit = (await catalogo(nombreParaBuscar(p.nombre), cats[0])).find((h) => cnDeCodigo(h.sku) === p.cn);
  if (!hit) return NO_ENCONTRADO;
  const url = hit.url ?? (hit.canonical ? BASE + hit.canonical : `${BASE}/${hit.slug}`);
  const f = await leerFicha(url);
  return f ? resultadoDeFicha(p, f) : NO_ENCONTRADO;
}

export const farmaciaJimenez: AdaptadorFarmacia = {
  clave: 'farmaciajimenez',
  nombre: 'Farmacia Jiménez',
  buscar: (p) => conErrores(() => buscar(p)),
};
