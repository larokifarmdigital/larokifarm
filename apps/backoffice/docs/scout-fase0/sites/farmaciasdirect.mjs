// Farmaciasdirect (.com redirige a .es). Shopify headless (Hydrogen/Oxygen): no hay
// /search/suggest.json ni /products/<handle>.js. Búsqueda: API pública de Empathy
// (instancia sacada del HTML). Verificación: JSON-LD Product de la ficha (gtin13 + sku = CN).

export const nombre = 'Farmaciasdirect';

const BASE = 'https://www.farmaciasdirect.es';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
let last = 0;
let empathy = null; // { instance, lang, store }
export let peticiones = 0;

async function throttle() {
  const espera = last + 1100 - Date.now();
  if (espera > 0) await new Promise((r) => setTimeout(r, espera));
  last = Date.now();
  peticiones++;
}

async function get(url, { accept = 'text/html,application/xhtml+xml', extra = {} } = {}) {
  await throttle();
  const r = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': UA, 'accept-language': 'es-ES,es;q=0.9', accept, ...extra },
  });
  return { status: r.status, url: r.url, body: await r.text() };
}

function esReto(res) {
  return res.status === 403 || res.status === 503 || /Just a moment|cf-chl|challenge-platform/i.test(res.body.slice(0, 5000));
}

async function initEmpathy() {
  if (empathy) return empathy;
  const home = await get('https://www.farmaciasdirect.com/');
  if (esReto(home)) throw Object.assign(new Error('bloquea'), { bloquea: true });
  const instance = home.body.match(/"EMPATHY_INSTANCE"\s*:\s*"([^"]+)"/)?.[1] ?? home.body.match(/"instance"\s*:\s*"([^"]+)"/)?.[1];
  if (!instance) throw new Error('no encuentro la instancia de Empathy');
  empathy = {
    instance,
    lang: home.body.match(/"EMPATHY_LANGUAGE"\s*:\s*"([^"]+)"/)?.[1] ?? 'es',
    store: home.body.match(/"EMPATHY_STORE"\s*:\s*"([^"]+)"/)?.[1] ?? 'es',
  };
  return empathy;
}

async function buscarEmpathy(query) {
  const { instance, lang, store } = await initEmpathy();
  const u = `https://api.empathy.co/search/v1/query/${instance}/search?query=${encodeURIComponent(query)}&lang=${lang}&store=${store}&currency=EUR&rows=10&start=0&scope=desktop`;
  const r = await get(u, { accept: 'application/json', extra: { origin: BASE, referer: `${BASE}/` } });
  if (r.status !== 200) throw new Error(`Empathy ${r.status}`);
  return JSON.parse(r.body).catalog?.content ?? [];
}

// CN a partir de un sku/id. Estricto: "165892-6" es un PACK de 6 (no un dígito de control)
// y NO cuenta como el CN 165892. Acepta "760017", "7600176", "760017.6" y skus con
// prefijo de letras + EAN 847000xxxxxxD (p. ej. "CI8470002141926"), validando el control.
function eanValido(e) {
  if (!/^\d{13}$/.test(e)) return false;
  const s = [...e.slice(0, 12)].reduce((a, d, i) => a + Number(d) * (i % 2 ? 3 : 1), 0);
  return (10 - (s % 10)) % 10 === Number(e[12]);
}
function cnDe(s) {
  const t = String(s ?? '').trim();
  if (/^\d{6}$/.test(t)) return { cn: t };
  if (/^\d{6}\.?\d$/.test(t)) return { cn: t.slice(0, 6), nota: `CN con dígito control: ${t}` };
  const e = t.match(/^[A-Z]{0,4}(847000\d{7})$/)?.[1];
  if (e && eanValido(e)) return { cn: e.slice(6, 12), nota: `CN deducido del código 847000 "${t}"` };
  if (/^\d{6}-\d+$/.test(t)) return { cn: null, pack: t };
  return { cn: null };
}
const cn6 = (s) => cnDe(s).cn;

function productoLd(html) {
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
    let d;
    try { d = JSON.parse(m[1]); } catch { continue; }
    for (const n of Array.isArray(d) ? d : d['@graph'] ?? [d]) {
      const t = [].concat(n['@type'] ?? []);
      if (t.includes('Product')) return n;
    }
  }
  return null;
}

async function leerFicha(url) {
  const r = await get(url);
  if (esReto(r)) return { bloquea: true };
  if (r.status !== 200) return { error: `ficha ${r.status}` };
  const ld = productoLd(r.body);
  if (!ld) return { error: 'ficha sin JSON-LD Product' };
  const offers = [].concat(ld.offers ?? []);
  const precios = offers.map((o) => Number(o.price ?? o.lowPrice)).filter((n) => n > 0);
  const sku = ld.sku ?? ld.productID ?? null;
  const ean = (ld.gtin13 ?? ld.gtin ?? '').toString().replace(/\D/g, '') || null;
  // Precio tachado de la variante seleccionada (estado de Hydrogen en el HTML).
  const cmp = r.body.match(/&quot;compareAtPrice&quot;:\{&quot;amount&quot;:&quot;([\d.]+)&quot;/)?.[1];
  const variantes = r.body.match(/&quot;sku&quot;:&quot;/g)?.length ?? 0;
  return {
    url: (ld.url || r.url).split('?')[0],
    precio: precios[0] ?? null,
    nPrecios: precios.length,
    compareAt: cmp ? Number(cmp) : null,
    eanFicha: ean,
    skuFicha: sku,
    cnInfo: cnDe(sku).cn ? cnDe(sku) : (ean && ean.startsWith('847000') && eanValido(ean) ? { cn: ean.slice(6, 12), nota: 'CN deducido del EAN 847000 de la ficha' } : cnDe(sku)),
    nombreFicha: ld.name ?? null,
    variantes,
  };
}

function resultado(p, f, via, nota) {
  let estado;
  if (p.ean && f.eanFicha === p.ean) estado = 'verificado';
  else if (f.cnInfo.cn === p.cn) estado = 'verificado';
  else if (!f.cnInfo.cn && !f.cnInfo.pack && (!f.eanFicha || !p.ean)) estado = 'sin_codigo';
  else estado = 'codigo_distinto';
  const notas = [nota];
  if (f.nPrecios > 1) notas.push(`${f.nPrecios} offers en JSON-LD, uso la primera`);
  if (f.compareAt && f.precio && f.compareAt > f.precio + 0.005) notas.push(`precio tachado ${f.compareAt}`);
  if (f.cnInfo.nota) notas.push(f.cnInfo.nota);
  if (f.cnInfo.pack) notas.push(`sku de pack ${f.cnInfo.pack}`);
  if (estado === 'sin_codigo' && f.eanFicha) notas.push(`la ficha solo trae EAN de fabricante ${f.eanFicha} (no tenemos EAN para comparar)`);
  return {
    estado, url: f.url, precio: f.precio, eanFicha: f.eanFicha, cnFicha: f.skuFicha,
    nombreFicha: f.nombreFicha, via, nota: notas.filter(Boolean).join('; ') || null,
  };
}

const nombreBusqueda = (n) => n.replace(/[@!]+/g, ' ').replace(/\s+/g, ' ').trim();
const coincide = (p) => (h) => cn6(h.id) === p.cn || cn6(h.referencia) === p.cn;

export async function buscar(p) {
  const base = { url: null, precio: null, eanFicha: null, cnFicha: null, nombreFicha: null };
  try {
    const intentos = p.ean ? [['ean', p.ean], ['cn', p.cn]] : [['cn', p.cn]];
    for (const [tipo, q] of intentos) {
      const hits = (await buscarEmpathy(q)).filter(coincide(p));
      if (!hits.length) continue;
      const via = `empathy:${tipo}`;
      const h = hits[0];
      const f = await leerFicha(h.link);
      if (f.bloquea) return { ...base, estado: 'bloquea', via, nota: 'reto en ficha' };
      if (f.error) return { ...base, estado: 'error', url: h.link, via, nota: f.error };
      const r = resultado(p, f, via, hits.length > 1 ? `${hits.length} resultados con ese CN` : null);
      if (h.precioFinal && f.precio && Math.abs(h.precioFinal - f.precio) > 0.005) {
        r.nota = [r.nota, `Empathy dice ${h.precioFinal}, uso el de la ficha`].filter(Boolean).join('; ');
      }
      return r;
    }
    const via = 'empathy:nombre';
    const hits = await buscarEmpathy(nombreBusqueda(p.nombre));
    const vistos = [];
    let primero = null;
    for (const h of hits.slice(0, 3)) {
      const f = await leerFicha(h.link);
      if (f.bloquea) return { ...base, estado: 'bloquea', via, nota: 'reto en ficha' };
      if (f.error) continue;
      vistos.push(`${f.skuFicha ?? '?'} ${f.nombreFicha}`);
      if (f.cnInfo.cn === p.cn || (p.ean && f.eanFicha === p.ean)) return resultado(p, f, via, 'encontrado por nombre');
      if (!primero) primero = f;
    }
    // Si el primer candidato por nombre no muestra ningún CN (solo EAN de fabricante), lo
    // anoto como sin_codigo: precio orientativo, NO verificado.
    if (primero && !primero.cnInfo.cn && !primero.cnInfo.pack) {
      const r = resultado(p, primero, via, `primer resultado por nombre; otros: ${vistos.slice(1).join(' | ') || '-'}`);
      if (r.estado === 'sin_codigo') return r;
    }
    return { ...base, estado: 'no_encontrado', via, nota: vistos.length ? `candidatos por nombre con otro código: ${vistos.join(' | ')}` : 'sin resultados' };
  } catch (e) {
    if (e.bloquea) return { ...base, estado: 'bloquea', via: null, nota: e.message };
    return { ...base, estado: 'error', via: null, nota: e.message };
  }
}
