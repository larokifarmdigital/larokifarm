// Adapter R2 (S3-compatible). Adaptado del conciliador-albaranes.
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { StorageRepository } from '../domain';

export class StorageR2 implements StorageRepository {
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
