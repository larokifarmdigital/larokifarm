// Farmaciasdirect (.com redirige a .es). Shopify headless: busca con la API
// pública de Empathy (la instancia sale del HTML de la portada). La ficha trae
// JSON-LD sku = CN y gtin13 = EAN. Ojo: un sku "165892-6" es un PACK de 6.
import type { Producto } from '../../domain/models';
import type { AdaptadorFarmacia, ResultadoFarmacia } from '../../domain/ports';
import { cnDeCodigo } from '../../domain/codigos';
import { ClienteWeb } from '../web/clienteWeb';
import { precioUnidad, productoJsonLd, texto } from '../web/ficha';
import { NO_ENCONTRADO, comprobarFicha, conErrores, nombreParaBuscar, resultadoDeFicha, type DatosFicha } from './comun';

const BASE = 'https://www.farmaciasdirect.es';
const web = new ClienteWeb(['farmaciasdirect.es', 'farmaciasdirect.com', 'api.empathy.co']);
let empathy: { instancia: string; idioma: string; tienda: string } | null = null;

interface HitEmpathy {
  id?: string;
  referencia?: string;
  link?: string;
}

async function configEmpathy() {
  if (empathy) return empathy;
  const home = await web.get('https://www.farmaciasdirect.com/');
  const instancia = home.body.match(/"EMPATHY_INSTANCE"\s*:\s*"([^"]+)"/)?.[1];
  if (!instancia) throw new Error('No encuentro la configuración del buscador');
  empathy = {
    instancia,
    idioma: home.body.match(/"EMPATHY_LANGUAGE"\s*:\s*"([^"]+)"/)?.[1] ?? 'es',
    tienda: home.body.match(/"EMPATHY_STORE"\s*:\s*"([^"]+)"/)?.[1] ?? 'es',
  };
  return empathy;
}

async function buscarEmpathy(q: string): Promise<HitEmpathy[]> {
  const { instancia, idioma, tienda } = await configEmpathy();
  const u = `https://api.empathy.co/search/v1/query/${instancia}/search?query=${encodeURIComponent(q)}&lang=${idioma}&store=${tienda}&currency=EUR&rows=10&start=0&scope=desktop`;
  const j = await web.json<{ catalog?: { content?: HitEmpathy[] } }>(u, { headers: { origin: BASE, referer: `${BASE}/` } });
  return j.catalog?.content ?? [];
}

async function leerFicha(url: string): Promise<DatosFicha | null> {
  const r = await web.get(url);
  if (r.status !== 200) return null;
  const prod = productoJsonLd(r.body);
  if (!prod) return null;
  // Precio tachado de la variante elegida (estado de Hydrogen embebido en el HTML).
  const cmp = r.body.match(/&quot;compareAtPrice&quot;:\{&quot;amount&quot;:&quot;([\d.]+)&quot;/)?.[1];
  return {
    url: String(prod.url ?? r.url).split('?')[0],
    precio: precioUnidad(prod),
    precioAntes: cmp ? Number(cmp) : null,
    nombre: texto(prod.name),
    codigos: [texto(prod.sku ?? prod.productID)],
    ean: texto(prod.gtin13 ?? prod.gtin),
  };
}

async function buscar(p: Producto): Promise<ResultadoFarmacia> {
  const coincide = (h: HitEmpathy) => cnDeCodigo(h.id) === p.cn || cnDeCodigo(h.referencia) === p.cn;
  for (const q of p.ean ? [p.ean, p.cn] : [p.cn]) {
    const hit = (await buscarEmpathy(q)).find(coincide);
    if (!hit?.link) continue;
    const f = await leerFicha(hit.link);
    if (f) return resultadoDeFicha(p, f);
  }
  let sinCodigo: ResultadoFarmacia | null = null;
  for (const h of (await buscarEmpathy(nombreParaBuscar(p.nombre))).slice(0, 3)) {
    if (!h.link) continue;
    const f = await leerFicha(h.link);
    if (!f) continue;
    const c = comprobarFicha(p, f);
    if (c === 'verificado') return resultadoDeFicha(p, f, 'encontrado por nombre');
    // Solo el primer resultado por nombre, y solo si no muestra ningún código.
    if (c === 'sin_codigo' && !sinCodigo) sinCodigo = resultadoDeFicha(p, f, 'primer resultado por nombre; la ficha no muestra CN');
  }
  return sinCodigo ?? NO_ENCONTRADO;
}

export const farmaciasDirect: AdaptadorFarmacia = {
  clave: 'farmaciasdirect',
  nombre: 'Farmaciasdirect',
  buscar: (p) => conErrores(() => buscar(p)),
};
