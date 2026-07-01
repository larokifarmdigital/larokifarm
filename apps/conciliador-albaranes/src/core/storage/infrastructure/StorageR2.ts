/**
 * Adapter R2 (Cloudflare) del puerto StorageRepository.
 *
 * R2 es S3-compatible → usamos `@aws-sdk/client-s3` con `endpoint` custom.
 * Las URLs de descarga siguen pasando por `/api/files/[...key]?token=…` para
 * preservar el control de acceso por sesión + scoping por business slug
 * (mismo flujo que `StorageLocal`). Cuando convenga ahorrarse ese proxy se
 * puede emitir URLs pre-firmadas de R2; por ahora no merece la pena.
 */
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { StorageRepository } from '../domain/repositories/StorageRepository';
import { signDownloadToken } from './downloadToken';

export interface StorageR2Config {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

export class StorageR2 implements StorageRepository {
  private client: S3Client;
  private bucket: string;

  constructor(config: StorageR2Config) {
    this.client = new S3Client({
      region: 'auto',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true,
    });
    this.bucket = config.bucket;
  }

  async upload(key: string, data: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
      }),
    );
  }

  async read(key: string): Promise<{ data: Buffer; contentType: string }> {
    const out = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!out.Body) throw new Error(`Objeto vacío en R2: ${key}`);
    const data = Buffer.from(await out.Body.transformToByteArray());
    return {
      data,
      contentType: out.ContentType ?? 'application/octet-stream',
    };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async getDownloadUrl(
    key: string,
    filename: string,
    expiresInSec = 300,
  ): Promise<string> {
    const token = signDownloadToken(key, filename, expiresInSec);
    return `/api/files/${encodeURI(key)}?token=${token}`;
  }
}
