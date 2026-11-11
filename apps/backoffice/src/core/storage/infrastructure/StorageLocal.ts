// Adapter de disco local para dev (STORAGE_DRIVER=local).
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { StorageRepository } from '../domain';

export class StorageLocal implements StorageRepository {
  constructor(private baseDir: string) {}
  private path(key: string) {
    return join(this.baseDir, key);
  }
  async upload(key: string, data: Buffer, contentType: string): Promise<void> {
    const p = this.path(key);
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, data);
    // NOTE: content-type no se persiste en local; el API route lo infiere del filename.
    void contentType;
  }
  async read(key: string): Promise<{ data: Buffer; contentType: string }> {
    const data = await readFile(this.path(key));
    return { data, contentType: contentTypeFromKey(key) };
  }
  async delete(key: string): Promise<void> {
    try {
      await unlink(this.path(key));
    } catch {
      /* best-effort */
    }
  }
}

function contentTypeFromKey(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'svg') return 'image/svg+xml';
  if (ext === 'gif') return 'image/gif';
  return 'application/octet-stream';
}
