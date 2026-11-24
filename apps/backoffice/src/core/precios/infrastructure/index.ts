import type { PriceCheckRepository } from '../domain/ports';
import { PriceCheckRepositoryPrisma } from './PriceCheckRepositoryPrisma';
import { PriceListRepositoryPrisma } from './PriceListRepositoryPrisma';

export { cima } from './cima';
export { nomenclator } from './nomenclator';
export { FARMACIAS, farmaciasPara, farmaciaPorClave, catalogoFarmavazquez, sinBusquedaPorNombre } from './farmacias';
export { registrarUsoComparador } from './usoComparador';

let repo: PriceCheckRepository | null = null;
export function getPriceCheckRepository(): PriceCheckRepository {
  repo ??= new PriceCheckRepositoryPrisma();
  return repo;
}

let listas: PriceListRepositoryPrisma | null = null;
export function getPriceListRepository(): PriceListRepositoryPrisma {
  listas ??= new PriceListRepositoryPrisma();
  return listas;
}
export { ListaActivaError, type PriceListRepositoryPrisma } from './PriceListRepositoryPrisma';
export { lanzarEjecucion } from './lanzador';
export { procesarComparacion } from './proceso';
