// Storage R2 adaptado del conciliador-albaranes (mismo contrato S3-compatible).
// El backoffice sube imágenes de contenido (hero, sobre, logo) via las server
// actions de @/lib/actions/content-image-actions.
//
// En dev se puede usar el driver 'local' (STORAGE_DRIVER=local) — guarda en
// disco bajo STORAGE_LOCAL_DIR (./storage por defecto). En prod STORAGE_DRIVER=r2
// y las 4 R2_* obligatorias.

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export interface StorageRepository {
  upload(key: string, data: Buffer, contentType: string): Promise<void>;
  read(key: string): Promise<{ data: Buffer; contentType: string }>;
  delete(key: string): Promise<void>;
}

class StorageR2 implements StorageRepository {
  private client: S3Client;
  private bucket: string;

  constructor(cfg: { endpoint: string; accessKeyId: string; secretAccessKey: string; bucket: string }) {
    this.client = new S3Client({
      region: 'auto',
      endpoint: cfg.endpoint,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
      forcePathStyle: true,
    });
    this.bucket = cfg.bucket;
  }

  async upload(key: string, data: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: data, ContentType: contentType }),
    );
  }

  async read(key: string): Promise<{ data: Buffer; contentType: string }> {
    const out = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    if (!out.Body) throw new Error(`R2 vacío: ${key}`);
    return {
      data: Buffer.from(await out.Body.transformToByteArray()),
      contentType: out.ContentType ?? 'application/octet-stream',
    };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

class StorageLocal implements StorageRepository {
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

// ────────────────────────────────────────────────────────────────────
// Keys para content images
// Layout: <businessSlug>/content/<role>/<yyyy>/<cuid>-<safeName>.<ext>
// ────────────────────────────────────────────────────────────────────

export function buildContentImageKey(params: {
  businessSlug: string;
  role: 'logo' | 'hero' | 'sobre' | 'servicio' | 'gallery' | 'og';
  cuid: string;
  filename: string;
  createdAt?: Date;
}): string {
  const year = (params.createdAt ?? new Date()).getUTCFullYear();
  const safe = sanitizeFilename(params.filename);
  return [params.businessSlug, 'content', params.role, String(year), `${params.cuid}-${safe}`].join('/');
}

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\:*?"<>|\s]+/g, '_').slice(0, 180);
}
