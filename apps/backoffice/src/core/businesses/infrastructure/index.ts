import type { BusinessRepository } from '../domain/repositories/BusinessRepository';
import { BusinessRepositoryPrisma } from './BusinessRepositoryPrisma';

export { probarClaveGemini, type PruebaClaveGemini } from './probarClaveGemini';

let cached: BusinessRepository | null = null;

export function getBusinessRepository(): BusinessRepository {
  if (!cached) cached = new BusinessRepositoryPrisma();
  return cached;
}
