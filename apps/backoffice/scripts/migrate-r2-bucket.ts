/**
 * Copia TODOS los objetos del bucket R2 actual (R2_*) a un bucket nuevo
 * (NEW_R2_*), p. ej. de una cuenta de Cloudflare a otra.
 *
 * - Conserva la key y el Content-Type: la BD solo guarda keys, no hay que
 *   tocar nada más.
 * - Re-ejecutable: salta los objetos que ya existen en destino con el mismo
 *   tamaño. Úsalo otra vez justo después de cambiar las credenciales para
 *   copiar lo que se haya subido entre medias.
 * - Nunca borra nada (ni en origen ni en destino).
 *
 * Uso (desde apps/backoffice):
 *   pnpm migrate:r2                # dry-run: lista lo que copiaría
 *   pnpm migrate:r2 --write        # copia real + verificación final
 *
 * Env (.env.local):
 *   Origen:  R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
 *   Destino: NEW_R2_ENDPOINT, NEW_R2_ACCESS_KEY_ID, NEW_R2_SECRET_ACCESS_KEY, NEW_R2_BUCKET
 */

import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const DRY_RUN = !process.argv.includes('--write');
const CONCURRENCY = 8;

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta la variable ${name} en .env.local`);
  return v;
}

function client(prefix: '' | 'NEW_') {
  return {
    bucket: env(`${prefix}R2_BUCKET`),
    s3: new S3Client({
      region: 'auto',
      endpoint: env(`${prefix}R2_ENDPOINT`),
      credentials: {
        accessKeyId: env(`${prefix}R2_ACCESS_KEY_ID`),
        secretAccessKey: env(`${prefix}R2_SECRET_ACCESS_KEY`),
      },
    }),
  };
}

type Obj = { key: string; size: number };

async function listAll(c: ReturnType<typeof client>): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  let token: string | undefined;
  do {
    const r = await c.s3.send(new ListObjectsV2Command({ Bucket: c.bucket, ContinuationToken: token }));
    for (const o of r.Contents ?? []) if (o.Key) out.set(o.Key, o.Size ?? 0);
    token = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (token);
  return out;
}

async function copyOne(src: ReturnType<typeof client>, dst: ReturnType<typeof client>, o: Obj) {
  const got = await src.s3.send(new GetObjectCommand({ Bucket: src.bucket, Key: o.key }));
  const body = await got.Body!.transformToByteArray();
  await dst.s3.send(
    new PutObjectCommand({
      Bucket: dst.bucket,
      Key: o.key,
      Body: body,
      ContentType: got.ContentType,
      CacheControl: got.CacheControl,
      ContentDisposition: got.ContentDisposition,
    }),
  );
  const head = await dst.s3.send(new HeadObjectCommand({ Bucket: dst.bucket, Key: o.key }));
  if ((head.ContentLength ?? -1) !== o.size) throw new Error(`tamaño distinto tras copiar (${head.ContentLength} ≠ ${o.size})`);
}

async function main() {
  const src = client('');
  const dst = client('NEW_');
  if (src.bucket === dst.bucket && env('R2_ENDPOINT') === env('NEW_R2_ENDPOINT')) {
    throw new Error('Origen y destino son el mismo bucket.');
  }

  console.log(`Origen:  ${src.bucket}\nDestino: ${dst.bucket}\nModo:    ${DRY_RUN ? 'DRY-RUN (no copia nada)' : 'ESCRITURA'}\n`);

  const [srcObjs, dstObjs] = await Promise.all([listAll(src), listAll(dst)]);
  const pending: Obj[] = [...srcObjs]
    .filter(([k, size]) => dstObjs.get(k) !== size)
    .map(([key, size]) => ({ key, size }));
  const totalMb = (pending.reduce((s, o) => s + o.size, 0) / 1e6).toFixed(1);

  console.log(`En origen: ${srcObjs.size} · ya en destino: ${srcObjs.size - pending.length} · por copiar: ${pending.length} (${totalMb} MB)`);
  if (DRY_RUN) {
    for (const o of pending.slice(0, 20)) console.log(`  · ${o.key}`);
    if (pending.length > 20) console.log(`  … y ${pending.length - 20} más`);
    console.log('\nDry-run: ejecuta con --write para copiar.');
    return;
  }

  let done = 0;
  const failed: string[] = [];
  const queue = [...pending];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let o = queue.shift(); o; o = queue.shift()) {
        try {
          await copyOne(src, dst, o);
        } catch (e) {
          failed.push(`${o.key}: ${(e as Error).message}`);
        }
        done++;
        if (done % 50 === 0 || done === pending.length) console.log(`  ${done}/${pending.length}`);
      }
    }),
  );

  // Verificación final: todo lo del origen tiene que estar en destino con el mismo tamaño.
  const after = await listAll(dst);
  const missing = [...srcObjs].filter(([k, size]) => after.get(k) !== size).map(([k]) => k);

  console.log(`\nCopiados: ${pending.length - failed.length} · fallidos: ${failed.length}`);
  for (const f of failed) console.log(`  ✗ ${f}`);
  console.log(missing.length === 0 ? '✓ Verificado: el destino tiene todos los objetos del origen.' : `✗ Faltan ${missing.length} objetos en destino.`);
  if (failed.length || missing.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
