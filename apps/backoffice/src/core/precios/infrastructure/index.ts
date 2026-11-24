import type { PriceCheckRepository } from '../domain/ports';
import { PriceCheckRepositoryPrisma } from './PriceCheckRepositoryPrisma';

export { cima } from './cima';
export { nomenclator } from './nomenclator';
export { FARMACIAS, farmaciasPara, farmaciaPorClave, catalogoFarmavazquez } from './farmacias';
export { registrarUsoComparador } from './usoComparador';

let repo: PriceCheckRepository | null = null;
export function getPriceCheckRepository(): PriceCheckRepository {
  repo ??= new PriceCheckRepositoryPrisma();
  return repo;
}
