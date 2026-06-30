import type { BusinessRepository } from '../domain/repositories/BusinessRepository';
import { BusinessRepositoryPrisma } from './BusinessRepositoryPrisma';

let cached: BusinessRepository | null = null;

export function getBusinessRepository(): BusinessRepository {
  if (!cached) cached = new BusinessRepositoryPrisma();
  return cached;
}
