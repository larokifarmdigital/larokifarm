// Factory del storage. En dev STORAGE_DRIVER=local guarda en disco bajo
// STORAGE_LOCAL_DIR (./storage por defecto). En prod STORAGE_DRIVER=r2 y las
// 4 R2_* obligatorias.
import type { StorageRepository } from '../domain';
import { StorageLocal } from './StorageLocal';
import { StorageR2 } from './StorageR2';

let cached: StorageRepository | null = null;

export function getStorage(): StorageRepository {
  if (cached) return cached;
  const driver = (process.env.STORAGE_DRIVER ?? 'local') as 'local' | 'r2';
  if (driver === 'local') {
    cached = new StorageLocal(process.env.STORAGE_LOCAL_DIR ?? './storage');
    return cached;
  }
  cached = new StorageR2({
    endpoint: requireEnv('R2_ENDPOINT'),
    accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
    secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
    bucket: requireEnv('R2_BUCKET'),
  });
  return cached;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta env: ${name}`);
  return v;
}
