// Precio oficial (PVP con IVA) del Nomenclátor de facturación del Ministerio de
// Sanidad: un CSV público (~4,5 MB) que se actualiza cada mes y solo trae los
// medicamentos financiados. Se descarga bajo demanda y se guarda en memoria.
import type { PrecioOficialPort } from '../domain/ports';

const URL_CSV =
  'https://www.sanidad.gob.es/profesionales/nomenclator.do?metodo=buscarProductos&especialidad=%25%25%25&d-4015021-e=1&6578706f7274=1';
const VIGENCIA_MS = 12 * 60 * 60 * 1000;

let cache: { precios: Map<string, number>; cargado: number } | null = null;
let cargando: Promise<Map<string, number>> | null = null;

/** Parte una línea CSV con comillas ("a, b",c). */
function campos(linea: string): string[] {
  const out: string[] = [];
  let actual = '';
  let comillas = false;
  for (const ch of linea) {
    if (ch === '"') comillas = !comillas;
    else if (ch === ',' && !comillas) {
      out.push(actual);
      actual = '';
    } else actual += ch;
  }
  out.push(actual);
  return out;
}

async function descargar(): Promise<Map<string, number>> {
  const res = await fetch(URL_CSV, { headers: { 'user-agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Nomenclátor HTTP ${res.status}`);
  const lineas = (await res.text()).split(/\r?\n/);
  const cab = campos(lineas[0] ?? '');
  const iCn = cab.findIndex((c) => /c.digo nacional/i.test(c));
  const iPvp = cab.findIndex((c) => /precio venta al p.blico con iva/i.test(c));
  if (iCn < 0 || iPvp < 0) throw new Error('Nomenclátor: cabecera desconocida');
  const precios = new Map<string, number>();
  for (const l of lineas.slice(1)) {
    const c = campos(l);
    const pvp = Number(c[iPvp]);
    if (/^\d{6}$/.test(c[iCn] ?? '') && pvp > 0) precios.set(c[iCn], pvp);
  }
  return precios;
}

export const nomenclator: PrecioOficialPort = {
  async deCn(cn) {
    if (!cache || Date.now() - cache.cargado > VIGENCIA_MS) {
      cargando ??= descargar().finally(() => {
        cargando = null;
      });
      try {
        cache = { precios: await cargando, cargado: Date.now() };
      } catch (e) {
        // Sin el Nomenclátor se sigue: el aviso dirá "Precio oficial no disponible".
        console.error('[precios] nomenclátor no disponible', (e as Error).message);
        if (!cache) return null;
      }
    }
    return cache.precios.get(cn) ?? null;
  },
};
