/**
 * Smoke test de Fase 4: BYOK end-to-end + RBAC.
 *
 * 1. Set una API key falsa en el negocio larokifarm vía SetGeminiApiKeyUseCase.
 * 2. Lee geminiKeyEnc de Postgres y verifica que NO es plaintext.
 * 3. Lee con BusinessRepository.getDecryptedGeminiKey y verifica round-trip.
 * 4. Limpia (set vacío) y verifica fallback global.
 *
 * Uso: `pnpm tsx scripts/smoke-fase4.ts`
 */
import { PrismaClient } from '@prisma/client';
import { getBusinessRepository, SetGeminiApiKeyUseCase } from '../src/core/businesses';
import { getUserRepository, ListUsersUseCase } from '../src/core/users';

const prisma = new PrismaClient();
const FAKE_API_KEY = 'test_byok_KEY_value_12345';

async function main() {
  const negocio = await prisma.business.findUnique({ where: { slug: 'larokifarm' } });
  const superAdmin = await prisma.user.findUnique({ where: { email: 'erick@laroki.com' } });
  const businessAdmin = await prisma.user.findUnique({
    where: { email: 'admin@larokifarm.com' },
  });
  if (!negocio || !superAdmin || !businessAdmin) {
    throw new Error('Falta seed (corre pnpm db:seed).');
  }

  const sessionSuper = {
    user: {
      id: superAdmin.id,
      email: superAdmin.email,
      name: superAdmin.name,
      role: 'SUPER_ADMIN' as const,
      businessId: null,
    },
    expires: '2099-01-01',
  };
  const sessionBA = {
    user: {
      id: businessAdmin.id,
      email: businessAdmin.email,
      name: businessAdmin.name,
      role: 'BUSINESS_ADMIN' as const,
      businessId: businessAdmin.businessId,
    },
    expires: '2099-01-01',
  };

  const businessRepo = getBusinessRepository();
  const userRepo = getUserRepository();

  // 1. Set BYOK
  const setKey = new SetGeminiApiKeyUseCase(businessRepo);
  await setKey.execute(sessionSuper, negocio.id, FAKE_API_KEY);

  // 2. Verificar que en BD NO está en plaintext
  const row = await prisma.business.findUnique({
    where: { id: negocio.id },
    select: { geminiKeyEnc: true },
  });
  if (!row?.geminiKeyEnc) throw new Error('geminiKeyEnc no se guardó.');
  if (row.geminiKeyEnc.includes(FAKE_API_KEY)) {
    throw new Error('¡La key está en plaintext! Cifrado roto.');
  }
  console.log(`✓ Cifrada en BD: ${row.geminiKeyEnc.slice(0, 32)}...`);

  // 3. Round-trip: descifrar y comparar
  const decrypted = await businessRepo.getDecryptedGeminiKey(negocio.id);
  if (decrypted !== FAKE_API_KEY) {
    throw new Error(`Round-trip falló: esperado "${FAKE_API_KEY}", got "${decrypted}"`);
  }
  console.log(`✓ Round-trip cifrar/descifrar OK`);

  // 4. RBAC: ListUsers
  const listUsers = new ListUsersUseCase(userRepo);
  const usersSuper = await listUsers.execute(sessionSuper);
  const usersBA = await listUsers.execute(sessionBA);
  console.log(`✓ SUPER_ADMIN ve ${usersSuper.length} usuarios totales`);
  console.log(`✓ BUSINESS_ADMIN ve ${usersBA.length} usuarios de su negocio`);
  if (usersBA.some((u) => u.role === 'SUPER_ADMIN')) {
    throw new Error('BUSINESS_ADMIN NO debería ver SUPER_ADMIN.');
  }

  // 5. Limpiar BYOK
  await setKey.execute(sessionSuper, negocio.id, '');
  const cleared = await businessRepo.findById(negocio.id);
  if (cleared?.hasGeminiKey) {
    throw new Error('La key no se limpió.');
  }
  console.log(`✓ BYOK limpiada → vuelve a fallback global`);

  console.log('\nTodo OK ✅');
}

main()
  .catch((err) => {
    console.error('\n❌', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
