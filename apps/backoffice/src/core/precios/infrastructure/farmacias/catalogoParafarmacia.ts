// Catálogo de parafarmacia para "Comparar precio". Farmavázquez es la fuente
// principal (su buscador devuelve el CN), pero desde los servidores de Vercel
// no responde (comprobado 25-11-2026: «physiorelax» da 0 resultados en
// producción y 10 desde una conexión normal). Plan B: preguntar el CN a otras
// farmacias a la vez y tomar el nombre de la primera cuya ficha muestre ese
// mismo CN (la regla de siempre: `comprobarFicha`).
import type { CatalogoParafarmacia } from '../../domain/ports';
import { catalogoFarmavazquez } from './farmavazquez';
import { farmaciaBarata } from './farmaciaBarata';
import { farmaciasDirect } from './farmaciasDirect';
import { farma2go } from './farma2go';
import { catalogoOkfarma, okfarma } from './okfarma';
import { sinBusquedaPorNombre } from './comun';

const RESPALDO = [farmaciaBarata, farmaciasDirect, farma2go, okfarma];
const TIEMPO_RESPALDO_MS = 20_000;
// La página /scout tiene 60 s: Farmavázquez (hasta 3 peticiones de 12 s) + plan B no deben pasarse.
const TIEMPO_FARMAVAZQUEZ_MS = 15_000;

function conPlazo<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<never>((_, rechazar) => setTimeout(() => rechazar(new Error('tiempo agotado')), ms))]);
}

/** Ni Farmavázquez ni el plan B han podido responder: no sabemos si el producto existe. */
export class CatalogoNoDisponibleError extends Error {
  constructor(detalle: string) {
    super(`No se ha podido consultar el catálogo de parafarmacia (${detalle})`);
    this.name = 'CatalogoNoDisponibleError';
  }
}

async function porCnEnFarmacias(cn: string): Promise<{ nombre: string } | null> {
  const producto = { cn, ean: null, nombre: '', tipo: 'parafarmacia' as const };
  const intentos = RESPALDO.map((f) =>
    sinBusquedaPorNombre(() => f.buscar(producto)).then((r) => {
      if (r.estado === 'verificado' && r.nombreFicha?.trim()) return { nombre: r.nombreFicha.trim(), farmacia: f.clave };
      throw new Error(`${f.clave}: ${r.estado}`);
    }),
  );
  try {
    const r = await conPlazo(Promise.any(intentos), TIEMPO_RESPALDO_MS);
    console.info('[precios] parafarmacia identificada por el plan B', { farmacia: r.farmacia });
    return { nombre: r.nombre };
  } catch {
    return null;
  }
}

export const catalogoParafarmacia: CatalogoParafarmacia = {
  async porCn(cn) {
    let fallo: string | null = null;
    try {
      const r = await conPlazo(catalogoFarmavazquez.porCn(cn), TIEMPO_FARMAVAZQUEZ_MS);
      if (r) return r;
    } catch (e) {
      fallo = (e as Error).message;
      // Solo el motivo (sin datos personales): para ver en Vercel por qué falla.
      console.error('[precios] Farmavázquez no responde al identificar', { motivo: fallo });
    }
    const respaldo = await porCnEnFarmacias(cn);
    if (respaldo) return respaldo;
    if (fallo) throw new CatalogoNoDisponibleError(fallo);
    return null;
  },
  // Por nombre: Farmavázquez y, si falla o no encuentra nada, el buscador de OKFarma.
  async porNombre(texto) {
    try {
      const r = await conPlazo(catalogoFarmavazquez.porNombre(texto), TIEMPO_FARMAVAZQUEZ_MS);
      if (r.length) return r;
    } catch (e) {
      console.error('[precios] Farmavázquez no responde al buscar por nombre', { motivo: (e as Error).message });
    }
    return conPlazo(catalogoOkfarma.porNombre(texto), TIEMPO_RESPALDO_MS);
  },
};
