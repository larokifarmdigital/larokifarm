import type { ComparisonRepository } from '../domain/repositories/ComparisonRepository';
import type { AiUsageRepository } from '../domain/repositories/AiUsageRepository';
import { AiUsageRepositoryPrisma } from './AiUsageRepositoryPrisma';
import { ComparisonRepositoryPrisma } from './ComparisonRepositoryPrisma';

let cached: ComparisonRepository | null = null;

export function getComparisonRepository(): ComparisonRepository {
  if (!cached) cached = new ComparisonRepositoryPrisma();
  return cached;
}

let cachedAi: AiUsageRepository | null = null;

export function getAiUsageRepository(): AiUsageRepository {
  if (!cachedAi) cachedAi = new AiUsageRepositoryPrisma();
  return cachedAi;
}
