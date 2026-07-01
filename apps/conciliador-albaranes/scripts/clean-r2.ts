/**
 * Vacía el bucket R2 configurado en las envs `R2_*`.
 *
 * Lista todos los objetos con paginación y los borra en lotes de 1000 (límite
 * de la API S3 `DeleteObjects`). Idempotente.
 *
 * Uso: `pnpm tsx --env-file=.env scripts/clean-r2.ts`
 */
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta env: ${name}`);
  return v;
}

async function main() {
  const bucket = req('R2_BUCKET');
  const client = new S3Client({
    region: 'auto',
    endpoint: req('R2_ENDPOINT'),
    credentials: {
      accessKeyId: req('R2_ACCESS_KEY_ID'),
      secretAccessKey: req('R2_SECRET_ACCESS_KEY'),
    },
    // Virtual-hosted style: R2 con endpoint jurisdictional (…/eu.r2…) rutea
    // mejor `ListObjectsV2` así. `StorageR2` de la app usa pathStyle porque
    // solo hace operaciones sobre objetos (Get/Put/Delete), donde no aplica.
  });

  let continuationToken: string | undefined;
  let totalDeleted = 0;

  do {
    const list = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: continuationToken }),
    );
    const keys = (list.Contents ?? [])
      .map((o) => o.Key)
      .filter((k): k is string => Boolean(k));

    if (keys.length === 0) break;

    // DeleteObjects admite máx 1000 keys por request.
    for (let i = 0; i < keys.length; i += 1000) {
      const chunk = keys.slice(i, i + 1000);
      const res = await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true },
        }),
      );
      const errs = res.Errors ?? [];
      if (errs.length > 0) {
        console.error(`⚠  ${errs.length} errores en el chunk:`, errs.slice(0, 3));
      }
      totalDeleted += chunk.length - errs.length;
      console.log(`  → borrados ${totalDeleted} objetos…`);
    }

    continuationToken = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (continuationToken);

  console.log(`✅ Bucket "${bucket}" vaciado. Total borrados: ${totalDeleted}`);
}

main().catch((err) => {
  console.error('❌ clean-r2 falló:', err);
  process.exit(1);
});
