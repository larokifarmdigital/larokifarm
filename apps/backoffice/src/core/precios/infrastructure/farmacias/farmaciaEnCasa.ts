// Farmacia en Casa Online (PrestaShop + tema stsitebuilder). Buscador nativo
// /busqueda?controller=search&s=<q>: indexa la referencia (= CN) pero es difuso
// (sin coincidencia devuelve productos sin relación), así que SIEMPRE se
// comprueba la ficha: "Código: <CN>" visible y JSON-LD sku/mpn = CN.
// No vende medicamentos sin receta.
import * as cheerio from 'cheerio';
import type { Producto } from '../../domain/models';
import type { AdaptadorFarmacia, ResultadoFarmacia } from '../../domain/ports';
import { parsePrecio } from '../../domain/codigos';
import { ClienteWeb } from '../web/clienteWeb';
import { precioUnidad, productoJsonLd, texto } from '../web/ficha';
import { NO_ENCONTRADO, comprobarFicha, conErrores, nombreParaBuscar, resultadoDeFicha, type DatosFicha } from './comun';

const BASE = 'https://www.farmaciaencasaonline.es';
const web = new ClienteWeb(['farmaciaencasaonline.es']);

async function listado(q: string): Promise<{ url: string; titulo: string }[]> {
  const r = await web.get(`${BASE}/busqueda?controller=search&s=${encodeURIComponent(q)}`);
  const $ = cheerio.load(r.body);
  return $('article.product-miniature')
    .map((_, el) => ({
      url: $(el).find('a.product-thumbnail').first().attr('href') ?? '',
      titulo: $(el).find('img').first().attr('alt') || $(el).find('.product-title a').text().trim(),
    }))
    .get()
    .filter((x) => x.url);
}

async function leerFicha(url: string): Promise<DatosFicha | null> {
  const r = await web.get(url);
  if (r.status !== 200) return null;
  const $ = cheerio.load(r.body);
  const prod = productoJsonLd(r.body);
  // Solo el bloque de precio del producto principal (los relacionados usan las mismas clases).
  const w = $('[data-widget_type="st-product-price.default"]').filter((_, e) => $(e).find('.stsb_pm_price').length > 0).first();
  return {
    url: r.url,
    precio: precioUnidad(prod) ?? parsePrecio(w.find('.stsb_pm_price').first().text()),
    precioAntes: parsePrecio(w.find('.stsb_pm_old_price').first().text()),
    nombre: texto(prod?.name) ?? texto($('h1').first().text()),
    codigos: [texto($('.stsb_pm_info_reference .stsb_pm_info_v').first().text()), texto(prod?.sku), texto(prod?.mpn)],
    ean: texto(prod?.gtin13),
  };
}

const sinAcentos = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

async function buscar(p: Producto): Promise<ResultadoFarmacia> {
  if (p.tipo !== 'parafarmacia') return { ...NO_ENCONTRADO, nota: 'no vende medicamentos' };
  for (const it of (await listado(p.cn)).slice(0, 2)) {
    const f = await leerFicha(it.url);
    if (f && comprobarFicha(p, f) === 'verificado') return resultadoDeFicha(p, f);
  }
  // Por nombre: solo fichas cuyo título comparta palabras clave (el buscador es difuso).
  const claves = sinAcentos(nombreParaBuscar(p.nombre)).split(/\s+/).filter((w) => w.length >= 4 && !/\d/.test(w));
  const minimo = Math.max(1, Math.min(2, claves.length));
  const candidatos = (await listado(nombreParaBuscar(p.nombre).split(' ').slice(0, 3).join(' '))).filter(
    (x) => claves.filter((k) => sinAcentos(x.titulo).includes(k)).length >= minimo,
  );
  for (const it of candidatos.slice(0, 2)) {
    const f = await leerFicha(it.url);
    if (f && comprobarFicha(p, f) === 'verificado') return resultadoDeFicha(p, f, 'encontrado por nombre');
  }
  return NO_ENCONTRADO;
}

export const farmaciaEnCasa: AdaptadorFarmacia = {
  clave: 'farmaciaencasa',
  nombre: 'Farmacia en Casa Online',
  soloParafarmacia: true,
  buscar: (p) => conErrores(() => buscar(p)),
};
