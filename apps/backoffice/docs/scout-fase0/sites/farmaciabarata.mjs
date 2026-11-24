// Farmacia Barata (PrestaShop + Cloudflare). /busqueda devuelve 403 "Just a moment...",
// pero el endpoint ajax del propio buscador (is_searchbar) y las fichas responden 200 por HTTP.
import * as cheerio from 'cheerio';

export const nombre = 'Farmacia Barata';
const BASE = 'https://www.farmaciabarata.es';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const MAX_CANDIDATOS = 3;

let ultima = 0;
export let peticiones = 0;
async function get(url, extra = {}) {
  const espera = ultima + 1100 - Date.now();
  if (espera > 0) await new Promise((r) => setTimeout(r, espera));
  ultima = Date.now();
  peticiones++;
  const r = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'es-ES,es;q=0.9', Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', ...extra },
    redirect: 'follow',
  });
  const texto = await r.text();
  return { status: r.status, url: r.url, texto };
}
const esReto = (r) => r.status === 403 || r.status === 503 || /<title>Just a moment/i.test(r.texto);

async function buscarAjax(q) {
  const r = await get(`${BASE}/module/is_searchbar/ajaxSearch?ajax=1&s=${encodeURIComponent(q)}`, { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json, text/javascript, */*; q=0.01' });
  if (esReto(r)) return { bloquea: true, urls: [] };
  let j;
  try { j = JSON.parse(r.texto); } catch { return { error: `respuesta no JSON (${r.status})`, urls: [] }; }
  const $ = cheerio.load(j.content || '');
  const urls = [...new Set($('a.product-miniature__name-link').map((_, e) => $(e).attr('href')).get())];
  return { urls };
}

function leerFicha(html) {
  const $ = cheerio.load(html);
  let prod = null;
  $('script[type="application/ld+json"]').each((_, e) => {
    try {
      const d = JSON.parse($(e).html());
      for (const x of [d, ...(d['@graph'] || [])]) if (x && x['@type'] === 'Product') prod = prod || x;
    } catch {}
  });
  const offer = prod && (Array.isArray(prod.offers) ? prod.offers[0] : prod.offers);
  let precio = offer?.price != null ? Number(offer.price) : NaN;
  if (!Number.isFinite(precio)) precio = Number($('meta[property="product:price:amount"]').attr('content'));
  const precioAntes = Number($('meta[property="product:price:standard_amount"]').attr('content')) || null;
  return {
    nombreFicha: prod?.name || $('h1').first().text().trim() || null,
    precio: Number.isFinite(precio) ? precio : null,
    precioAntes,
    eanFicha: prod?.gtin13 ? String(prod.gtin13) : null,
    cnFicha: prod?.sku ? String(prod.sku) : null,
  };
}

const limpiarNombre = (n) => n.replace(/^[^@]*@\s*/, '').replace(/[!@]/g, ' ').replace(/\s+/g, ' ').trim();

export async function buscar(producto) {
  const { cn, ean, tipo, nombre: nom } = producto;
  const vias = [['cn', cn]];
  if (ean) vias.push(['ean', ean]);
  if (tipo === 'parafarmacia') vias.push(['nombre', limpiarNombre(nom)]);
  let mejorSinCodigo = null, distinto = null;
  try {
    for (const [via, q] of vias) {
      const res = await buscarAjax(q);
      if (res.bloquea) return { estado: 'bloquea', url: null, precio: null, eanFicha: null, cnFicha: null, nombreFicha: null, via, nota: 'ajaxSearch con reto Cloudflare' };
      if (res.error) return { estado: 'error', url: null, precio: null, eanFicha: null, cnFicha: null, nombreFicha: null, via, nota: res.error };
      for (const url of res.urls.slice(0, MAX_CANDIDATOS)) {
        const f = await get(url);
        if (esReto(f)) return { estado: 'bloquea', url, precio: null, eanFicha: null, cnFicha: null, nombreFicha: null, via, nota: 'ficha con reto Cloudflare' };
        if (f.status !== 200) continue;
        const d = leerFicha(f.texto);
        const cnOk = d.cnFicha && d.cnFicha.replace(/\D/g, '').slice(0, 6) === cn && /^\d{6,7}$/.test(d.cnFicha.replace(/\D/g, ''));
        const eanOk = ean && d.eanFicha === ean;
        // Un EAN 847000+CN también identifica el CN aunque no busquemos por EAN.
        const eanCnOk = d.eanFicha && /^847\d{10}$/.test(d.eanFicha) && d.eanFicha.slice(6, 12) === cn;
        const notaPrecio = d.precioAntes && d.precioAntes !== d.precio ? `precio rebajado (antes ${d.precioAntes})` : '';
        const base = { url: f.url, precio: d.precio, eanFicha: d.eanFicha, cnFicha: d.cnFicha, nombreFicha: d.nombreFicha, via };
        if (eanOk || cnOk || eanCnOk) {
          const notas = [];
          if (d.cnFicha && d.cnFicha.replace(/\D/g, '').length === 7) notas.push(`CN con dígito control ${d.cnFicha}`);
          if (ean && d.eanFicha && d.eanFicha !== ean) notas.push(`EAN ficha ${d.eanFicha} distinto del buscado pero CN coincide`);
          notas.push(eanOk ? 'EAN JSON-LD gtin13' : 'CN JSON-LD sku');
          if (notaPrecio) notas.push(notaPrecio);
          return { estado: 'verificado', ...base, nota: notas.join('; ') };
        }
        if (d.eanFicha || d.cnFicha) distinto = distinto || { estado: 'codigo_distinto', ...base, nota: `ficha con otro código (sku ${d.cnFicha}, gtin13 ${d.eanFicha})` };
        else mejorSinCodigo = mejorSinCodigo || { estado: 'sin_codigo', ...base, nota: 'ficha sin sku/gtin13' };
      }
      if (res.urls.length && via !== 'nombre') break; // el buscador encontró algo por código: no seguir con vías más débiles
    }
  } catch (e) {
    return { estado: 'error', url: null, precio: null, eanFicha: null, cnFicha: null, nombreFicha: null, via: null, nota: String(e.message || e) };
  }
  return distinto || mejorSinCodigo || { estado: 'no_encontrado', url: null, precio: null, eanFicha: null, cnFicha: null, nombreFicha: null, via: vias.map((v) => v[0]).join('+'), nota: 'ajaxSearch sin resultados' };
}
