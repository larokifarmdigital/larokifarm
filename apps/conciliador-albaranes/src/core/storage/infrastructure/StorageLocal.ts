/**
 * Adapter local del puerto StorageRepository.
 *
 * Guarda en disco bajo `STORAGE_LOCAL_DIR` con el layout estándar. Genera
 * URLs firmadas con HMAC sobre `AUTH_SECRET` (token corto que expira en
 * segundos) — la verificación vive en `verifyDownloadToken`.
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type { StorageRepository } from '../domain/repositories/StorageRepository';
import { signDownloadToken } from './downloadToken';

export class StorageLocal implements StorageRepository {
  private root: string;
  private contentTypesPath: string;

  constructor(rootDir: string) {
    this.root = resolve(rootDir);
    this.contentTypesPath = join(this.root, '.contentTypes.json');
  }

  private fullPath(key: string): string {
    // Defensa anti path-traversal.
    const target = resolve(this.root, key);
    if (!target.startsWith(this.root + '/') && target !== this.root) {
      throw new Error(`Storage key inválido: ${key}`);
    }
    return target;
  }

  async upload(key: string, data: Buffer, contentType: string): Promise<void> {
    const path = this.fullPath(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
    await this.recordContentType(key, contentType);
  }

  async read(key: string): Promise<{ data: Buffer; contentType: string }> {
    const path = this.fullPath(key);
    const data = await readFile(path);
    const contentType = await this.lookupContentType(key);
    return { data, contentType };
  }

  async delete(key: string): Promise<void> {
    const path = this.fullPath(key);
    if (existsSync(path)) await unlink(path);
  }

  async getDownloadUrl(
    key: string,
    filename: string,
    expiresInSec = 300,
  ): Promise<string> {
    const token = signDownloadToken(key, filename, expiresInSec);
    return `/api/files/${encodeURI(key)}?token=${token}`;
  }

  // Mapa key → contentType en un .json en el root del storage.
  // En el adapter `Spaces` esto lo guarda S3 como object metadata.
  private async readMap(): Promise<Record<string, string>> {
    if (!existsSync(this.contentTypesPath)) return {};
    try {
      const raw = await readFile(this.contentTypesPath, 'utf8');
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  private async recordContentType(key: string, contentType: string): Promise<void> {
    await mkdir(this.root, { recursive: true });
    const map = await this.readMap();
    map[key] = contentType;
    await writeFile(this.contentTypesPath, JSON.stringify(map, null, 2));
  }

  private async lookupContentType(key: string): Promise<string> {
    const map = await this.readMap();
    return map[key] ?? 'application/octet-stream';
  }
}
