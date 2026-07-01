/**
 * Seed inicial.
 *
 * Crea (idempotente) únicamente el SUPER_ADMIN con las credenciales de
 * `SEED_SUPER_ADMIN_EMAIL`, `SEED_SUPER_ADMIN_PASSWORD` y `SEED_SUPER_ADMIN_NAME`.
 *
 * Los negocios y sus usuarios se crean desde el panel `/admin` como
 * SUPER_ADMIN — no se hardcodean aquí.
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
  console.log(`  Contraseña: ${SEED_PASSWORD}`);
  console.log('');
  console.log('Listo. Arranca con `pnpm dev` y entra a http://localhost:3000/login');
  console.log('Desde /admin puedes crear negocios y usuarios.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
