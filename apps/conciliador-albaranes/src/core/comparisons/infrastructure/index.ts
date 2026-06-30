import type { ComparisonRepository } from '../domain/repositories/ComparisonRepository';
import { ComparisonRepositoryPrisma } from './ComparisonRepositoryPrisma';

let cached: ComparisonRepository | null = null;

export function getComparisonRepository(): ComparisonRepository {
  if (!cached) cached = new ComparisonRepositoryPrisma();
  return cached;
}
