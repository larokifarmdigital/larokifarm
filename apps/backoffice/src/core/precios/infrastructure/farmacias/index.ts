import type { AdaptadorFarmacia } from '../../domain/ports';
import type { TipoProducto } from '../../domain/models';
import { farmaciaBarata } from './farmaciaBarata';
import { farmaciaEnCasa } from './farmaciaEnCasa';
import { farmaciaJimenez } from './farmaciaJimenez';
import { farmaciasDirect } from './farmaciasDirect';
import { farmavazquez } from './farmavazquez';
import { farma2go } from './farma2go';
import { farmaciaMarket } from './farmaciaMarket';
import { farmaciaSenante } from './farmaciaSenante';
import { okfarma } from './okfarma';
import { tedin } from './tedin';

/**
 * Lista fija elegida por gestión: las que muestran el CN/EAN en la ficha y no bloquean.
 * Descartadas: PromoFarma, Atida, DosFarma, Arenal, Farmaconfianza, Druni, Farmacia Ribera, Pharmacius, F+.
 */
export const FARMACIAS: readonly AdaptadorFarmacia[] = [
  farma2go,
  farmaciaBarata,
  farmaciaEnCasa,
  farmaciaJimenez,
  farmaciaMarket,
  farmaciaSenante,
  farmaciasDirect,
  farmavazquez,
  okfarma,
  tedin,
];

/** Farmacias a consultar para un tipo de producto (con receta: ninguna). */
export function farmaciasPara(tipo: TipoProducto): readonly AdaptadorFarmacia[] {
  if (tipo === 'receta') return [];
  return FARMACIAS.filter((f) => tipo === 'parafarmacia' || !f.soloParafarmacia);
}

export function farmaciaPorClave(clave: string): AdaptadorFarmacia | undefined {
  return FARMACIAS.find((f) => f.clave === clave);
}

export { catalogoFarmavazquez } from './farmavazquez';
export { catalogoParafarmacia, CatalogoNoDisponibleError } from './catalogoParafarmacia';
export { sinBusquedaPorNombre } from './comun';
