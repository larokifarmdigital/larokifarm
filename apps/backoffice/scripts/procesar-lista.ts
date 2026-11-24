// Procesa una comparación de lista del comparador de precios. Lo lanza el
// workflow .github/workflows/precios-lista.yml (o a mano en local):
//   RUN_ID=<id> pnpm --filter backoffice precios:lista
// El log solo lleva contadores: en un repo público los registros son públicos.
import { procesarComparacion } from '@/core/precios';
import { prisma } from '@/shared/lib/prisma';

async function main() {
  const runId = process.env.RUN_ID || process.argv[2];
  if (!runId || !/^[a-z0-9]{20,40}$/.test(runId)) throw new Error('Falta RUN_ID válido');
  const t0 = Date.now();
  await procesarComparacion(runId, (m) => console.log(`[${Math.round((Date.now() - t0) / 1000)} s] ${m}`));
}

main()
  .catch((e) => {
    console.error('Error:', (e as Error).name);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
