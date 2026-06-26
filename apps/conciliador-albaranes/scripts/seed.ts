/**
 * Seed inicial — Fase 1.
 *
 * Crea (idempotente):
 *   - 1 negocio "larokifarm" si no existe.
 *   - 1 SUPER_ADMIN con email/password de las vars SEED_SUPER_ADMIN_*.
 *
 * Uso: `pnpm tsx scripts/seed.ts`
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SEED_EMAIL = process.env.SEED_SUPER_ADMIN_EMAIL ?? 'erick@laroki.com';
const SEED_PASSWORD = process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'changeme123';
const SEED_NAME = process.env.SEED_SUPER_ADMIN_NAME ?? 'Erick';

async function main() {
  const business = await prisma.business.upsert({
    where: { slug: 'larokifarm' },
    update: {},
    create: {
      slug: 'larokifarm',
      name: 'Larokifarm',
    },
  });
  console.log(`✓ Negocio: ${business.name} (${business.slug})`);

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: SEED_EMAIL.toLowerCase() },
    update: {
      passwordHash,
      role: 'SUPER_ADMIN',
      active: true,
    },
    create: {
      email: SEED_EMAIL.toLowerCase(),
      name: SEED_NAME,
      passwordHash,
      role: 'SUPER_ADMIN',
      businessId: null,
      active: true,
    },
  });
  console.log(`✓ SUPER_ADMIN: ${superAdmin.email}  (sin negocio asignado)`);

  // Usuario operativo del negocio — para poder probar /api/conciliar en Fase 2.
  // En Fase 4 SUPER_ADMIN podrá hacer comparaciones eligiendo negocio en el sidebar.
  const businessAdminEmail = 'admin@larokifarm.com';
  const businessAdmin = await prisma.user.upsert({
    where: { email: businessAdminEmail },
    update: {
      passwordHash,
      role: 'BUSINESS_ADMIN',
      businessId: business.id,
      active: true,
    },
    create: {
      email: businessAdminEmail,
      name: 'Admin Larokifarm',
      passwordHash,
      role: 'BUSINESS_ADMIN',
      businessId: business.id,
      active: true,
    },
  });
  console.log(`✓ BUSINESS_ADMIN: ${businessAdmin.email}  (negocio: ${business.slug})`);

  console.log('');
  console.log(`  Contraseña (ambos): ${SEED_PASSWORD}`);
  console.log('');
  console.log('Listo. Arranca con `pnpm dev` y entra a http://localhost:3000/login');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
