// Farmacia en Casa Online — PrestaShop 1.7/8 + tema stsitebuilder (Elementor).
// Buscador nativo: GET /busqueda?controller=search&s=<q> (HTML con miniaturas).
// Indexa la referencia (= CN) pero es difuso: si no hay coincidencia devuelve
// productos sin relación, así que SIEMPRE se verifica en la ficha.
// Ficha: JSON-LD Product.sku/mpn = CN, gtin13 = EAN del fabricante, y texto
// visible "Código: <CN>" (.stsb_pm_info_reference).
import * as cheerio from 'cheerio';

export const nombre = 'Farmacia en Casa Online';
const BASE = 'https://www.farmaciaencasaonline.es';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept-Language': 'es-ES,es;q=0.9',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

const cookies = new Map();
let last = 0;
export let peticiones = 0;
async function get(url) {
  const wait = last + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  peticiones++;
  const cookie = [...cookies].map(([k, v]) => `${k}=${v}`).join('; ');
  const res = await fetch(url, { headers: { ...HEADERS, ...(cookie ? { Cookie: cookie } : {}) }, redirect: 'follow' });
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [kv] = c.split(';'); const i = kv.indexOf('=');
    if (i > 0) cookies.set(kv.slice(0, i).trim(), kv.slice(i + 1).trim());
  }
  const body = await res.text();
  if (res.status === 403 || res.status === 429 || /Just a moment|cf-chl-|challenge-platform\/h\//i.test(body.slice(0, 8000))) {
    const e = new Error(`bloqueo HTTP ${res.status}`); e.bloquea = true; throw e;
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return { body, url: res.url };
}

const digits = (s) => String(s ?? '').replace(/\D/g, '');
const num = (s) => { const n = Number(String(s).replace(/[^\d,.]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')); return Number.isFinite(n) ? n : null; };

async function buscarListado(q) {
  const { body } = await get(`${BASE}/busqueda?controller=search&s=${encodeURIComponent(q)}`);
  const $ = cheerio.load(body);
  const items = [];
  $('article.product-miniature').each((_, el) => {
    const a = $(el).find('a.product-thumbnail').first();
    items.push({
      url: a.attr('href'),
      titulo: $(el).find('img').first().attr('alt') || $(el).find('.product-title a').text().trim(),
      idAttr: $(el).attr('data-id-product-attribute'),
    });
  });
  return items.filter((x) => x.url);
}

function parseFicha(html) {
  const $ = cheerio.load(html);
  let prod = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const j = JSON.parse($(el).text());
      for (const n of [j, ...(j['@graph'] ?? [])]) if (n?.['@type'] === 'Product') prod = n;
    } catch {}
  });
  const offer = Array.isArray(prod?.offers) ? prod.offers[0] : prod?.offers;
  const codigoVisible = $('.stsb_pm_info_reference .stsb_pm_info_v').first().text().trim() || null;
  // Solo el widget de precio del producto principal (los relacionados usan las mismas clases).
  const w = $('[data-widget_type="st-product-price.default"]').filter((_, e) => $(e).find('.stsb_pm_price').length > 0).first();
  const txt = (sel) => w.find(sel).first().text();
  const precioVis = txt('.stsb_pm_price') ? num(txt('.stsb_pm_price')) : null;
  const precioAntes = txt('.stsb_pm_old_price') ? num(txt('.stsb_pm_old_price')) : null;
  const dto = txt('.stsb_pm_discount').replace(/\s+/g, ' ').trim();
  return {
    sku: prod?.sku ?? offer?.sku ?? null,
    mpn: prod?.mpn ?? offer?.mpn ?? null,
    gtin: prod?.gtin13 ?? offer?.gtin13 ?? null,
    codigoVisible,
    nombre: prod?.name ?? $('h1').first().text().trim(),
    precio: offer?.price != null ? Number(offer.price) : precioVis,
    precioVis, precioAntes, dto,
    availability: offer?.availability ?? null,
  };
}

function palabrasClave(p) {
  const tras = p.nombre.replace(/[@!]/g, ' ');
  return tras.split(/\s+/).filter((w) => w.length >= 4 && !/\d/.test(w)).map((w) => w.toLowerCase());
}
function queryNombre(p) {
  const marca = p.nombre.includes('@') ? p.nombre.split('@')[0].trim().split(/[-\s]/)[0] : '';
  const tras = (p.nombre.includes('@') ? p.nombre.split('@')[1] : p.nombre).replace(/!/g, ' ').trim();
  const w = tras.split(/\s+/).filter((x) => !/^\d|^(ML|GR?|U|CAPS|SOBRES|COMP|S\/A)$/i.test(x));
  const q = w.slice(0, 2).join(' ');
  return marca && !q.toUpperCase().includes(marca) ? `${marca} ${q}` : q;
}

export async function buscar(p) {
  const out = { estado: 'no_encontrado', url: null, precio: null, eanFicha: null, cnFicha: null, nombreFicha: null, via: null, nota: '' };
  const comprobadas = new Set();
  let mejorNoVerificado = null;

  async function comprobar(item, via) {
    if (comprobadas.has(item.url)) return false;
    comprobadas.add(item.url);
    const { body, url } = await get(item.url);
    const f = parseFicha(body);
    const codigos = [f.sku, f.mpn, f.codigoVisible].filter(Boolean).map(String);
    const cnOk = codigos.some((c) => /^\d{6,7}$/.test(digits(c)) && digits(c).slice(0, 6) === p.cn && digits(c) === c.replace(/[.\s-]/g, ''));
    const eanOk = p.ean && f.gtin && digits(f.gtin) === p.ean;
    const r = {
      url, precio: f.precio, eanFicha: f.gtin, cnFicha: f.codigoVisible ?? f.sku ?? null, nombreFicha: f.nombre, via,
      nota: `ficha: Código visible=${f.codigoVisible}, JSON-LD sku/mpn=${f.sku}/${f.mpn}, gtin13=${f.gtin}`,
    };
    if (codigos.some((c) => digits(c).length === 7)) r.nota += '; CN con 7 dígitos';
    if (f.precioAntes) r.nota += `; tachado ${f.precioAntes} (${f.dto || 'descuento'})`;
    if (f.precioVis != null && f.precio != null && Math.abs(f.precioVis - f.precio) > 0.001) r.nota += `; precio visible ${f.precioVis} ≠ JSON-LD`;
    if (f.availability && !/InStock/.test(f.availability)) r.nota += `; ${f.availability.split('/').pop()}`;
    if (item.idAttr && item.idAttr !== '0') r.nota += `; combinación id_attr=${item.idAttr}`;
    if (cnOk || eanOk) { Object.assign(out, r, { estado: 'verificado' }); return true; }
    if (!mejorNoVerificado) mejorNoVerificado = { ...r, estado: codigos.length || f.gtin ? 'codigo_distinto' : 'sin_codigo' };
    return false;
  }

  try {
    // 1) por CN (la búsqueda nativa indexa la referencia)
    const r1 = await buscarListado(p.cn);
    for (const it of r1.slice(0, 2)) if (await comprobar(it, 'cn')) return out;
    // 2) por nombre (el EAN no está indexado: devuelve resultados sin relación): solo fichas cuyo título comparta palabras clave
    const q = queryNombre(p);
    const r2 = await buscarListado(q);
    const kws = palabrasClave(p);
    const cands = r2.filter((x) => kws.filter((k) => x.titulo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(k)).length >= Math.max(1, Math.min(2, kws.length)));
    for (const it of cands.slice(0, 2)) if (await comprobar(it, `nombre("${q}")`)) return out;
    // No verificado: NO se devuelve el precio de un producto con otro código
    // (sería otra presentación); se deja en la nota.
    out.nota = `CN: ${r1.length} res. difusos [${r1.slice(0, 2).map((x) => x.titulo).join(' | ')}]; nombre "${q}": ${r2.length} res., ${cands.length} candidatos`;
    if (mejorNoVerificado) out.nota += `; revisado ${mejorNoVerificado.nombreFicha} (${mejorNoVerificado.cnFicha}) → otro código`;
    return out;
  } catch (e) {
    out.estado = e.bloquea ? 'bloquea' : 'error';
    out.nota += e.message;
    return out;
  }
}
