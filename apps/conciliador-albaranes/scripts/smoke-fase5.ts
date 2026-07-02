/**
 * Smoke test de Fase 5: pueblan agregados sintéticos y verifica el use case.
 *
 * Inserta 8 comparaciones ficticias en distintos meses (3 últimos meses),
 * usuarios (erick + admin@larokifarm) y estados (OK/DISCREPANCIAS/ERROR).
 * Después llama a GetUsageStatsUseCase con ambos roles y verifica que el RBAC
 * arroja agregados correctos.
 *
 * Uso: `pnpm tsx scripts/smoke-fase5.ts`         crea + verifica
 *      `pnpm tsx scripts/smoke-fase5.ts --clean` borra los smoke creados
 */
import { ComparisonStatus, PrismaClient } from '@prisma/client';
import { GetUsageStatsUseCase, getComparisonRepository } from '../src/core/comparisons';

const prisma = new PrismaClient();
const SMOKE_TAG = '__SMOKE_FASE5__';

async function clean() {
  const found = await prisma.comparison.findMany({
    where: { label: SMOKE_TAG },
    select: { id: true },
  });
  for (const c of found) await prisma.comparison.delete({ where: { id: c.id } });
  if (found.length) console.log(`✓ Limpiadas ${found.length} comparaciones smoke`);
}

async function main() {
  await clean();

  const business = await prisma.business.findUnique({ where: { slug: 'larokifarm' } });
  const erick = await prisma.user.findUnique({ where: { email: 'erick@laroki.com' } });
  const admin = await prisma.user.findUnique({ where: { email: 'admin@larokifarm.com' } });
  if (!business || !erick || !admin) throw new Error('Falta seed.');

  const now = new Date();
  const ago = (months: number) =>
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, 15));

  const samples = [
    // mes actual
    { ago: 0, user: admin, status: 'OK', pdfs: 1, disc: 0, inTok: 4500, outTok: 800 },
    { ago: 0, user: admin, status: 'DISCREPANCIES', pdfs: 2, disc: 3, inTok: 8200, outTok: 1100 },
    { ago: 0, user: admin, status: 'OK', pdfs: 1, disc: 0, inTok: 3800, outTok: 700 },
    { ago: 0, user: admin, status: 'ERROR', pdfs: 1, disc: 0, inTok: 0, outTok: 0 },
    // mes -1
    { ago: 1, user: admin, status: 'OK', pdfs: 3, disc: 1, inTok: 12000, outTok: 1500 },
    { ago: 1, user: admin, status: 'DISCREPANCIES', pdfs: 1, disc: 5, inTok: 4100, outTok: 950 },
    // mes -2
    { ago: 2, user: admin, status: 'OK', pdfs: 2, disc: 0, inTok: 7800, outTok: 1200 },
    { ago: 2, user: admin, status: 'OK', pdfs: 1, disc: 0, inTok: 4400, outTok: 850 },
  ] as const;

  for (const s of samples) {
    const inputCost = (s.inTok / 1_000_000) * 0.3;
    const outputCost = (s.outTok / 1_000_000) * 2.5;
    await prisma.comparison.create({
      data: {
        businessId: business.id,
        userId: s.user.id,
        createdAt: ago(s.ago),
        durationMs: 5000 + Math.floor(s.inTok / 10),
        status: s.status as ComparisonStatus,
        supplier: 'SMOKE',
        label: SMOKE_TAG,
        numPairs: 1,
        numPdfs: s.pdfs,
        numXlsx: 1,
        numDiscrepancies: s.disc,
        geminiInputTokens: s.inTok,
        geminiOutputTokens: s.outTok,
        geminiCostUsd: (inputCost + outputCost).toFixed(6),
        summary: { smoke: true },
      },
    });
  }
  console.log(`✓ Creadas ${samples.length} comparaciones sintéticas`);

  // RBAC
  const sessionSuper = {
    user: { id: erick.id, email: erick.email, name: erick.name, role: 'SUPER_ADMIN' as const, businessId: null, businessSlug: null },
    expires: '2099-01-01',
  };
  const sessionBA = {
    user: { id: admin.id, email: admin.email, name: admin.name, role: 'BUSINESS_ADMIN' as const, businessId: admin.businessId, businessSlug: business.slug },
    expires: '2099-01-01',
  };

  const repo = getComparisonRepository();
  const uc = new GetUsageStatsUseCase(repo);

  const su = await uc.execute(sessionSuper);
  const ba = await uc.execute(sessionBA);

  console.log('\n--- SUPER_ADMIN (todos los negocios) ---');
  console.log(`  Mes en curso: ${su.context.currentMonthLabel}`);
  console.log(`  Comparaciones (este mes): ${su.currentMonth.numComparisons}`);
  console.log(`  Tokens (este mes): ${su.currentMonth.geminiInputTokens + su.currentMonth.geminiOutputTokens}`);
  console.log(`  Coste estimado (este mes): $${su.currentMonth.geminiCostUsd.toFixed(4)}`);
  console.log(`  Evolución mensual rellenada: ${su.monthly.length} meses`);
  console.log(`  Top usuarios: ${su.topUsers.length}`);
  console.log(`  Desglose por negocio: ${su.byBusiness.length}`);

  console.log('\n--- BUSINESS_ADMIN (solo larokifarm) ---');
  console.log(`  Comparaciones (este mes): ${ba.currentMonth.numComparisons}`);
  console.log(`  Top usuarios: ${ba.topUsers.length}`);
  console.log(`  Desglose por negocio: ${ba.byBusiness.length} (debe ser 0)`);

  if (ba.byBusiness.length !== 0) {
    throw new Error('BUSINESS_ADMIN NO debería ver desglose por negocio.');
  }
  if (su.currentMonth.numComparisons < 4) {
    throw new Error(`Esperaba ≥4 comparaciones este mes, vi ${su.currentMonth.numComparisons}.`);
  }
  console.log('\n✅ Smoke Fase 5 OK');
}

const cmd = process.argv[2];
(cmd === '--clean' ? clean() : main())
  .catch((err) => {
    console.error('\n❌', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
