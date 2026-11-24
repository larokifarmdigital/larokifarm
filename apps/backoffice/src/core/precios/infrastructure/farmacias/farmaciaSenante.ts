// Farmacia Senante (PrestaShop 1.7, tema Warehouse). Busca con el buscador
// nativo en JSON (/busqueda?s=<q>&ajax=1): cada resultado trae `reference` = CN,
// así que solo se abre la ficha cuyo reference es nuestro CN. La ficha muestra
// "Referencia <CN>" (itemprop sku) y el data-product de #product-details trae
// reference, pack y el precio. Vende medicamentos sin receta.
import * as cheerio from 'cheerio';
import type { Producto } from '../../domain/models';
import type { AdaptadorFarmacia, ResultadoFarmacia } from '../../domain/ports';
import { cnDeCodigo, eanDeCn, parsePrecio } from '../../domain/codigos';
import { ClienteWeb } from '../web/clienteWeb';
import { precioUnidad, productoJsonLd, texto } from '../web/ficha';
import { NO_ENCONTRADO, conErrores, conBusquedaPorNombre, nombreParaBuscar, resultadoDeFicha, type DatosFicha } from './comun';

const BASE = 'https://farmaciasenante.com';
const web = new ClienteWeb(['farmaciasenante.com']);

interface HitPresta {
  reference?: string | null;
  url?: string;
}

/** "760017.6" solo es el CN si el 7º dígito es el de control; si no, es una variante o pack. */
function referencia(ref: unknown): string | null {
  const t = texto(ref);
  const m = t?.match(/^(\d{6})\.?(\d)$/);
  return m && eanDeCn(m[1]).slice(-1) !== m[2] ? `${m[1]}-${m[2]}` : t;
}

async function buscador(q: string): Promise<HitPresta[]> {
  const j = await web.json<{ products?: HitPresta[] }>(`${BASE}/busqueda?s=${encodeURIComponent(q)}&ajax=1`, {
    headers: { 'x-requested-with': 'XMLHttpRequest' },
  });
  return j.products ?? [];
}

async function leerFicha(url: string): Promise<DatosFicha | null> {
  const r = await web.get(url);
  if (r.status !== 200) return null;
  const $ = cheerio.load(r.body);
  const prod = productoJsonLd(r.body);
  let dp: Record<string, unknown> = {};
  try {
    dp = JSON.parse($('#product-details[data-product]').attr('data-product') ?? '{}') as Record<string, unknown>;
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
      referencia($('.product-prices .product-reference [itemprop="sku"]').first().text()),
      referencia(prod?.sku),
    ],
    ean: texto(dp.ean13) ?? texto(prod?.gtin13),
  };
}

async function buscar(p: Producto): Promise<ResultadoFarmacia> {
  const esCn = (h: HitPresta) => cnDeCodigo(referencia(h.reference)) === p.cn;
  let hit = (await buscador(p.cn)).find(esCn);
  let nota: string | undefined;
  if (!hit && conBusquedaPorNombre()) {
    hit = (await buscador(nombreParaBuscar(p.nombre).split(' ').slice(0, 3).join(' '))).find(esCn);
    nota = 'encontrado por nombre';
  }
  if (!hit?.url) return NO_ENCONTRADO;
  const f = await leerFicha(hit.url);
  return f ? resultadoDeFicha(p, f, nota) : NO_ENCONTRADO;
}

export const farmaciaSenante: AdaptadorFarmacia = {
  clave: 'farmaciasenante',
  nombre: 'Farmacia Senante',
  buscar: (p) => conErrores(() => buscar(p)),
};
