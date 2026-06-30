import type { StorageRepository } from '../domain/repositories/StorageRepository';
import { StorageLocal } from './StorageLocal';

let cached: StorageRepository | null = null;

export function getStorage(): StorageRepository {
  if (cached) return cached;
  const driver = (process.env.STORAGE_DRIVER ?? 'local') as 'local' | 'spaces';
  if (driver === 'local') {
    const dir = process.env.STORAGE_LOCAL_DIR ?? './storage';
    cached = new StorageLocal(dir);
    return cached;
  }
  if (driver === 'spaces') {
    throw new Error('Storage driver "spaces" se implementa en Fase 6.');
  }
  throw new Error(`STORAGE_DRIVER desconocido: ${driver}`);
}

export { verifyDownloadToken } from './StorageLocal';
