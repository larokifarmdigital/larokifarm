/**
 * Smoke test de Fase 3: inserta una Comparison ficticia (con un archivo
 * pequeño en storage) para poder navegar el detalle sin gastar tokens
 * de Gemini. Idempotente: si ya existe la borra y la rehace.
 *
 * Uso: `pnpm tsx scripts/smoke-fase3.ts`
 *
 * Después: borrar con `pnpm tsx scripts/smoke-fase3.ts --clean`.
 */
import { ComparisonStatus, FileKind, PrismaClient } from '@prisma/client';
import { buildStorageKey, getStorage } from '../src/shared/core';

const prisma = new PrismaClient();
const SMOKE_ETIQUETA = '__SMOKE_FASE3__';

async function clean() {
  const found = await prisma.comparison.findMany({
    where: { etiqueta: SMOKE_ETIQUETA },
    select: { id: true },
  });
  for (const c of found) {
    await prisma.comparison.delete({ where: { id: c.id } });
  }
  if (found.length) console.log(`✓ Limpiadas ${found.length} comparaciones smoke`);
}

async function main() {
  await clean();

  const business = await prisma.business.findUnique({
    where: { slug: 'larokifarm' },
  });
  if (!business) throw new Error('Negocio larokifarm no existe — corre el seed.');

  const user = await prisma.user.findUnique({
    where: { email: 'admin@larokifarm.com' },
  });
  if (!user) throw new Error('Usuario admin@larokifarm.com no existe — corre el seed.');

  const comparison = await prisma.comparison.create({
    data: {
      businessId: business.id,
      userId: user.id,
      durationMs: 12_345,
      status: ComparisonStatus.DISCREPANCIAS,
      proveedor: 'DENTAID (smoke)',
      etiqueta: SMOKE_ETIQUETA,
      numPairs: 1,
      numPdfs: 1,
      numXlsx: 1,
      numDiscrepancias: 3,
      geminiInputTokens: 4567,
      geminiOutputTokens: 890,
      geminiCostUsd: '0.012345',
      summary: { proveedor: 'DENTAID', numeroAlbaran: 'ALB-SMOKE-001' },
    },
  });

  const storage = getStorage();
  const filename = 'smoke.txt';
  const key = buildStorageKey({
    businessSlug: business.slug,
    comparisonId: comparison.id,
    kind: 'REPORT_OUTPUT',
    filename,
    createdAt: comparison.createdAt,
  });
  await storage.upload(
    key,
    Buffer.from('Hola desde el smoke test de Fase 3.\n'),
    'text/plain',
  );

  await prisma.comparisonFile.create({
    data: {
      comparisonId: comparison.id,
      kind: FileKind.REPORT_OUTPUT,
      filename,
      storageKey: key,
      sizeBytes: 36,
    },
  });

  console.log('');
  console.log('✓ Smoke creado:');
  console.log(`  ID:    ${comparison.id}`);
  console.log(`  URL:   http://localhost:3000/historial/${comparison.id}`);
  console.log(`  Key:   ${key}`);
  console.log('');
  console.log('Para limpiar:  pnpm tsx scripts/smoke-fase3.ts --clean');
}

const cmd = process.argv[2];
(cmd === '--clean' ? clean() : main())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
