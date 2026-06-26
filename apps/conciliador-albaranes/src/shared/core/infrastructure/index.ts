/**
 * Factories de los adapters compartidos por la app.
 *
 * Aquí viven los singletons que las features consumen. Importar SIEMPRE
 * desde aquí — nunca instancies los adapters por tu cuenta.
 */
import type { ComparisonRepository } from '../domain/repositories/ComparisonRepository';
import type { StorageRepository } from '../domain/repositories/StorageRepository';
import type { BusinessRepository } from '../domain/repositories/BusinessRepository';
import type { UserRepository } from '../domain/repositories/UserRepository';
import { ComparisonRepositoryPrisma } from './ComparisonRepositoryPrisma';
import { StorageLocal } from './StorageLocal';
import { BusinessRepositoryPrisma } from './BusinessRepositoryPrisma';
import { UserRepositoryPrisma } from './UserRepositoryPrisma';

let cachedComparisonRepo: ComparisonRepository | null = null;
export function getComparisonRepository(): ComparisonRepository {
  if (!cachedComparisonRepo) cachedComparisonRepo = new ComparisonRepositoryPrisma();
  return cachedComparisonRepo;
}

let cachedStorage: StorageRepository | null = null;
export function getStorage(): StorageRepository {
  if (cachedStorage) return cachedStorage;
  const driver = (process.env.STORAGE_DRIVER ?? 'local') as 'local' | 'spaces';
  if (driver === 'local') {
    const dir = process.env.STORAGE_LOCAL_DIR ?? './storage';
    cachedStorage = new StorageLocal(dir);
    return cachedStorage;
  }
  if (driver === 'spaces') {
    throw new Error('Storage driver "spaces" se implementa en Fase 6.');
  }
  throw new Error(`STORAGE_DRIVER desconocido: ${driver}`);
}

let cachedBusinessRepo: BusinessRepository | null = null;
export function getBusinessRepository(): BusinessRepository {
  if (!cachedBusinessRepo) cachedBusinessRepo = new BusinessRepositoryPrisma();
  return cachedBusinessRepo;
}

let cachedUserRepo: UserRepository | null = null;
export function getUserRepository(): UserRepository {
  if (!cachedUserRepo) cachedUserRepo = new UserRepositoryPrisma();
  return cachedUserRepo;
}

export { verifyDownloadToken } from './StorageLocal';
