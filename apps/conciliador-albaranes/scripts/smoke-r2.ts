/**
 * Smoke R2: sube → lee → borra un archivo de prueba contra el bucket real.
 *
 * Usa el mismo adapter que la app, así que valida configuración + credenciales.
 * Ejecutar con:  pnpm tsx scripts/smoke-r2.ts
 */
import { StorageR2 } from '../src/core/storage/infrastructure/StorageR2';

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta env: ${name}`);
  return v;
}

async function main() {
  const r2 = new StorageR2({
    endpoint: req('R2_ENDPOINT'),
    accessKeyId: req('R2_ACCESS_KEY_ID'),
    secretAccessKey: req('R2_SECRET_ACCESS_KEY'),
    bucket: req('R2_BUCKET'),
  });

  const key = `smoke/${Date.now()}/hello.txt`;
  const content = Buffer.from('hola desde smoke-r2 ✅');

  console.log(`→ subiendo ${key}`);
  await r2.upload(key, content, 'text/plain; charset=utf-8');

  console.log(`→ leyendo ${key}`);
  const read = await r2.read(key);
  if (read.data.toString('utf8') !== content.toString('utf8')) {
    throw new Error('contenido no coincide');
  }
  if (!read.contentType.startsWith('text/plain')) {
    throw new Error(`contentType inesperado: ${read.contentType}`);
  }

  console.log(`→ borrando ${key}`);
  await r2.delete(key);

  console.log('✅ Smoke R2 OK — upload, read, delete funcionando');
}

main().catch((err) => {
  console.error('❌ Smoke R2 falló:', err);
  process.exit(1);
});
