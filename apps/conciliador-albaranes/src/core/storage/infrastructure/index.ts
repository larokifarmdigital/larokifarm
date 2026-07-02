import type { StorageRepository } from '../domain/repositories/StorageRepository';
import { StorageLocal } from './StorageLocal';
import { StorageR2 } from './StorageR2';

let cached: StorageRepository | null = null;

export function getStorage(): StorageRepository {
  if (cached) return cached;
  const driver = (process.env.STORAGE_DRIVER ?? 'local') as 'local' | 'r2';

  if (driver === 'local') {
    const dir = process.env.STORAGE_LOCAL_DIR ?? './storage';
    cached = new StorageLocal(dir);
    return cached;
  }

  if (driver === 'r2') {
    const endpoint = requireEnv('R2_ENDPOINT');
    const accessKeyId = requireEnv('R2_ACCESS_KEY_ID');
    const secretAccessKey = requireEnv('R2_SECRET_ACCESS_KEY');
    const bucket = requireEnv('R2_BUCKET');
    cached = new StorageR2({ endpoint, accessKeyId, secretAccessKey, bucket });
    return cached;
  }

  throw new Error(`STORAGE_DRIVER desconocido: ${driver}`);
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta variable de entorno: ${name}`);
  return v;
}
