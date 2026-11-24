// Farmavázquez (PrestaShop 1.6 tras un 307 con cookie de reto).
// Búsqueda: API pública de Doofinder (hashid y zona sacados del script de config
// que carga la propia web). Verificación: ficha HTML (Ref/sku = CN).
import * as cheerio from 'cheerio';

export const nombre = 'Farmavázquez';

const HOME = 'https://www.farmavazquez.com/';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const jar = new Map(); // host -> Map(cookie -> valor)
let last = 0;
let df = null; // { hashid, zone }
let session = Math.random().toString(36).slice(2);
export let peticiones = 0;

async function throttle() {
  const espera = last + 1100 - Date.now();
  if (espera > 0) await new Promise((r) => setTimeout(r, espera));
  last = Date.now();
  peticiones++;
}

async function get(url, { accept = 'text/html,application/xhtml+xml', extra = {} } = {}) {
  for (let i = 0; i < 5; i++) {
    await throttle();
    const host = new URL(url).host;
    const cookies = jar.get(host) ?? new Map();
    const r = await fetch(url, {
      redirect: 'manual',
      headers: {
        'user-agent': UA,
        'accept-language': 'es-ES,es;q=0.9',
        accept,
        ...(cookies.size ? { cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; ') } : {}),
        ...extra,
      },
    });
    for (const c of r.headers.getSetCookie()) {
      const kv = c.split(';')[0];
      const p = kv.indexOf('=');
      cookies.set(kv.slice(0, p), kv.slice(p + 1));
    }
    jar.set(host, cookies);
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) {
      url = new URL(r.headers.get('location'), url).href;
      continue;
    }
    return { status: r.status, url, body: await r.text() };
  }
  throw new Error('demasiadas redirecciones');
}

function esReto(res) {
  return res.status === 403 || res.status === 503 || /Just a moment|cf-chl|challenge-platform/i.test(res.body.slice(0, 5000));
}

async function initDoofinder() {
  if (df) return df;
  const home = await get(HOME);
  if (esReto(home)) throw Object.assign(new Error('bloquea'), { bloquea: true });
  const m = home.body.match(/https:\/\/(\w+)-config\.doofinder\.com\/2\.x\/([0-9a-f-]+)\.js/);
  if (!m) throw new Error('no encuentro el script de Doofinder en el HTML');
  const cfg = await get(m[0], { accept: '*/*' });
  const hashid = cfg.body.match(/"hashid"\s*:\s*"([0-9a-f]{32})"/)?.[1];
  const zone = cfg.body.match(/"zone"\s*:\s*"(\w+)"/)?.[1] ?? m[1];
  if (!hashid) throw new Error('no encuentro hashid de Doofinder');
  df = { hashid, zone };
  return df;
}

async function doofinder(query) {
  const { hashid, zone } = await initDoofinder();
  const u = `https://${zone}-search.doofinder.com/6/${hashid}/_search?query=${encodeURIComponent(query)}&rpp=10&page=1&session_id=${session}`;
  const r = await get(u, { accept: 'application/json', extra: { origin: 'https://www.farmavazquez.com', referer: HOME } });
  if (r.status !== 200) throw new Error(`Doofinder ${r.status}`);
  return JSON.parse(r.body).results ?? [];
}

// Estricto: "760017", "7600176" o "760017.6". Un "165892-6" (pack) NO cuenta.
const cn6 = (s) => {
  const t = String(s ?? '').trim();
  return /^\d{6}(\.?\d)?$/.test(t) ? t.slice(0, 6) : null;
};

function parsePrecio(t) {
  if (t == null) return null;
  const s = String(t).replace(/[^\d,.]/g, '');
  const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function leerFicha(url) {
  const r = await get(url);
  if (esReto(r)) return { bloquea: true };
  if (r.status !== 200) return { error: `ficha ${r.status}` };
  const $ = cheerio.load(r.body);
  const refTxt = $('#product_reference .editable').first().text().trim()
    || r.body.match(/var productReference\s*=\s*'([^']*)'/)?.[1]
    || $('[itemprop="sku"]').first().text().trim();
  // Ojo: en farma-vazquez.com (medicamentos) el mpn del JSON-LD es el id interno, no el CN.
  let ean = null;
  const g = r.body.match(/"gtin13"\s*:\s*"(\d{13})"|itemprop="gtin13"\s+content="(\d{13})"/);
  if (g) ean = g[1] || g[2];
  const precio = parsePrecio($('#our_price_display').first().text())
    ?? parsePrecio($('meta[itemprop="price"]').attr('content'))
    ?? parsePrecio(r.body.match(/var productPrice\s*=\s*'?([\d.]+)/)?.[1]);
  const antes = parsePrecio($('#old_price_display').first().text());
  // El canonical a veces es basura ("1") o trae espacios: solo lo uso si es una URL de la web.
  const can = ($('link[rel="canonical"]').attr('href') || '').trim();
  const canonical = /^https:\/\/www\.farma-?vazquez\.com\/.+\.html$/.test(can) ? can : r.url.trim();
  return {
    url: canonical,
    precio,
    antes,
    eanFicha: ean,
    refFicha: refTxt || null,
    cnFicha: cn6(refTxt),
    nombreFicha: $('h1').first().text().trim() || null,
  };
}

function nombreBusqueda(n) {
  return n.replace(/[@!]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function resultado(p, f, via, nota) {
  let estado;
  if (f.eanFicha && p.ean && f.eanFicha === p.ean) estado = 'verificado';
  else if (f.cnFicha === p.cn) estado = 'verificado';
  else if (!f.cnFicha && !f.eanFicha) estado = 'sin_codigo';
  else estado = 'codigo_distinto';
  const notas = [nota];
  if (f.refFicha && /^\d{6}\.?\d$/.test(f.refFicha)) notas.push(`CN con dígito control: ${f.refFicha}`);
  if (f.antes) notas.push(`precio tachado ${f.antes}`);
  return {
    estado, url: f.url, precio: f.precio, eanFicha: f.eanFicha, cnFicha: f.refFicha,
    nombreFicha: f.nombreFicha, via, nota: notas.filter(Boolean).join('; ') || null,
  };
}

export async function buscar(p) {
  const base = { url: null, precio: null, eanFicha: null, cnFicha: null, nombreFicha: null };
  try {
    // 1) CN (la búsqueda por EAN no devuelve nada en Doofinder de esta web).
    let hits = await doofinder(p.cn);
    let exactos = hits.filter((h) => cn6(h.reference) === p.cn || cn6(h.mpn) === p.cn);
    let via = 'doofinder:cn';
    if (!exactos.length && p.ean) {
      hits = await doofinder(p.ean);
      exactos = hits.filter((h) => cn6(h.reference) === p.cn || cn6(h.mpn) === p.cn);
      via = 'doofinder:ean';
    }
    if (exactos.length) {
      const h = exactos[0];
      const f = await leerFicha(h.link.trim());
      if (f.bloquea) return { ...base, estado: 'bloquea', via, nota: 'reto en ficha' };
      if (f.error) return { ...base, estado: 'error', url: h.link, via, nota: f.error };
      const extra = exactos.length > 1 ? `${exactos.length} resultados con ese CN` : null;
      const r = resultado(p, f, via, extra);
      if (h.price && f.precio && Math.abs(h.price - f.precio) > 0.005) {
        r.nota = [r.nota, `Doofinder dice ${h.price} (índice desfasado), uso el de la ficha`].filter(Boolean).join('; ');
      }
      return r;
    }
    // 2) Nombre: verificar cada candidato por CN en la ficha.
    via = 'doofinder:nombre';
    hits = await doofinder(nombreBusqueda(p.nombre));
    const vistos = [];
    for (const h of hits.slice(0, 3)) {
      const f = await leerFicha(h.link.trim());
      if (f.bloquea) return { ...base, estado: 'bloquea', via, nota: 'reto en ficha' };
      if (f.error) continue;
      vistos.push(`${f.refFicha ?? '?'} ${f.nombreFicha}`);
      if (f.cnFicha === p.cn || (p.ean && f.eanFicha === p.ean)) return resultado(p, f, via, 'encontrado por nombre');
    }
    return { ...base, estado: 'no_encontrado', via, nota: vistos.length ? `candidatos por nombre con otro código: ${vistos.join(' | ')}` : 'sin resultados' };
  } catch (e) {
    if (e.bloquea) return { ...base, estado: 'bloquea', via: null, nota: e.message };
    return { ...base, estado: 'error', via: null, nota: e.message };
  }
}
