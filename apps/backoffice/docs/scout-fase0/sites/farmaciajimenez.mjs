// Farmacia Jiménez — plataforma propia (Laravel + Vue). El buscador llama a
// GET /busqueda/catalogo?q=&c=parafarmacia|msr&p=1 (JSON paginado, Elastic).
// El campo `sku` del índice es el CN. El EAN NO se indexa.
// Verificación: ficha → JSON-LD Product.sku/mpn (= CN) + meta product:retailer_item_id.
import * as cheerio from 'cheerio';

export const nombre = 'Farmacia Jiménez';
const BASE = 'https://farmaciajimenez.com';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept-Language': 'es-ES,es;q=0.9',
};

let last = 0;
export let peticiones = 0;
async function get(url, json = false) {
  const wait = last + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  peticiones++;
  const res = await fetch(url, {
    headers: { ...HEADERS, Accept: json ? 'application/json' : 'text/html,application/xhtml+xml' , ...(json ? { 'X-Requested-With': 'XMLHttpRequest' } : {}) },
    redirect: 'follow',
  });
  const body = await res.text();
  if (res.status === 403 || /Just a moment|cf-chl|captcha/i.test(body.slice(0, 5000))) {
    const e = new Error(`bloqueo HTTP ${res.status}`); e.bloquea = true; throw e;
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return json ? JSON.parse(body) : { body, url: res.url };
}

const cn6 = (s) => String(s ?? '').replace(/\D/g, '').slice(0, 6);

function queriesNombre(p) {
  const tras = (p.nombre.includes('@') ? p.nombre.split('@')[1] : p.nombre).replace(/!/g, ' ').trim();
  const marca = p.nombre.includes('@') ? p.nombre.split('@')[0].trim() : '';
  const palabras = tras.split(/\s+/).filter((w) => !/^\d|^(ML|GR?|U|CAPS|SOBRES|COMP)$/i.test(w));
  const qs = [palabras.slice(0, 3).join(' ')];
  if (marca && !qs[0].toUpperCase().includes(marca.split(/[-\s]/)[0])) qs.push(`${marca.split(/[-\s]/)[0]} ${palabras[0]}`);
  return [...new Set(qs.filter(Boolean))];
}

async function buscarApi(q, c) {
  const u = `${BASE}/busqueda/catalogo?q=${encodeURIComponent(q)}&c=${c}&p=1`;
  const d = await get(u, true);
  return d?.data ?? [];
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
  const precioLd = offer?.price != null ? Number(offer.price) : null;
  const visible = $('.mod-info-product__inner__description__buy__price .price').first().text();
  const precioVis = visible ? Number(visible.replace(/[^\d,]/g, '').replace(',', '.')) : null;
  return {
    sku: prod?.sku ?? offer?.sku ?? null,
    mpn: prod?.mpn ?? offer?.mpn ?? null,
    gtin: prod?.gtin13 ?? offer?.gtin13 ?? null,
    retailerId: $('meta[property="product:retailer_item_id"]').attr('content') ?? null,
    nombre: prod?.name ?? $('h1').first().text().trim(),
    precio: precioLd ?? precioVis,
    precioVis,
    availability: offer?.availability ?? null,
  };
}

export async function buscar(p) {
  const out = { estado: 'no_encontrado', url: null, precio: null, eanFicha: null, cnFicha: null, nombreFicha: null, via: null, nota: '' };
  try {
    const cats = p.tipo === 'sin_receta' ? ['msr', 'parafarmacia'] : ['parafarmacia', 'msr'];
    let hit = null;
    // 1) por CN (el índice lo admite: campo sku)
    for (const c of cats) {
      const r = await buscarApi(p.cn, c);
      hit = r.find((x) => cn6(x.sku) === p.cn);
      if (hit) { out.via = `cn(c=${c})`; break; }
      if (r.length) { out.nota += `CN en c=${c}: ${r.length} res. sin sku=${p.cn}; `; }
    }
    // 2) por nombre (solo se acepta si algún resultado tiene sku == CN)
    if (!hit) {
      const vistos = [];
      for (const q of queriesNombre(p)) {
        const r = await buscarApi(q, cats[0]);
        hit = r.find((x) => cn6(x.sku) === p.cn);
        if (hit) { out.via = `nombre("${q}")`; break; }
        vistos.push(...r.slice(0, 3).map((x) => `${x.title} [${x.sku}]`));
      }
      if (!hit) { out.nota += `nombre: ${vistos.slice(0, 4).join(' | ') || 'sin resultados'}`; return out; }
    }
    const url = hit.url || (hit.canonical ? BASE + hit.canonical : `${BASE}/${hit.slug}`);
    const { body, url: finalUrl } = await get(url);
    const f = parseFicha(body);
    out.url = finalUrl;
    out.precio = f.precio;
    out.nombreFicha = f.nombre;
    out.eanFicha = f.gtin;
    const codigos = [f.sku, f.mpn, f.retailerId].filter(Boolean).map(String);
    out.cnFicha = codigos[0] ?? null;
    if (p.ean && f.gtin && f.gtin === p.ean) out.estado = 'verificado';
    else if (codigos.some((c) => cn6(c) === p.cn && /^\d{6,7}$/.test(c.replace(/\D/g, '')))) {
      out.estado = 'verificado';
      if (codigos.some((c) => c.replace(/\D/g, '').length === 7)) out.nota += 'CN con 7 dígitos; ';
    } else if (codigos.length || f.gtin) out.estado = 'codigo_distinto';
    else out.estado = 'sin_codigo';
    out.nota += `ficha sku/mpn (JSON-LD)=${f.sku}/${f.mpn}`;
    if (f.precioVis != null && f.precio != null && Math.abs(f.precioVis - f.precio) > 0.001) out.nota += `; precio visible ${f.precioVis} ≠ JSON-LD`;
    if (f.availability && !/InStock/.test(f.availability)) out.nota += `; ${f.availability.split('/').pop()}`;
    if (hit.is_pack) out.nota += '; is_pack';
    return out;
  } catch (e) {
    out.estado = e.bloquea ? 'bloquea' : 'error';
    out.nota += e.message;
    return out;
  }
}
