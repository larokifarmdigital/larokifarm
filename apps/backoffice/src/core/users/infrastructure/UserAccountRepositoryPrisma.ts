import { Prisma, type Role } from '@prisma/client';
import { prisma } from '@/shared/lib/prisma';
import {
  UltimoAdminError,
  type OpcionesEscrituraAdmin,
  type RolCuenta,
  type UserAccount,
  type UserAccountRepository,
} from '../domain';

const A_DB: Record<RolCuenta, Role> = { admin: 'SUPER_ADMIN', manager: 'BUSINESS_ADMIN', viewer: 'USER' };
const DE_DB: Record<Role, RolCuenta> = { SUPER_ADMIN: 'admin', BUSINESS_ADMIN: 'manager', USER: 'viewer' };

// Nunca se selecciona passwordHash salvo en getPasswordHash.
const SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  businessId: true,
  active: true,
  createdAt: true,
  business: { select: { name: true } },
} satisfies Prisma.UserSelect;

type Row = Prisma.UserGetPayload<{ select: typeof SELECT }>;

type Tx = Prisma.TransactionClient;

/**
 * Escritura que no puede dejar la app sin administradores activos. Comprobación
 * y escritura van en una transacción Serializable: si dos administradores se
 * desactivan a la vez, una de las dos falla (P2034) y se reintenta.
 */
async function escribirGuardandoAdmin<T>(id: string, opts: OpcionesEscrituraAdmin | undefined, escribir: (tx: Tx) => Promise<T>): Promise<T> {
  if (!opts?.exigirOtroAdminActivo) return escribir(prisma);
  for (let intento = 1; ; intento++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const otros = await tx.user.count({ where: { role: 'SUPER_ADMIN', active: true, id: { not: id } } });
          if (otros === 0) throw new UltimoAdminError();
          return escribir(tx);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (e) {
      if (intento < 3 && e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2034') continue;
      throw e;
    }
  }
}

function mapRow(r: Row): UserAccount {
  return {
    id: r.id,
    nombre: r.name,
    email: r.email,
    rol: DE_DB[r.role],
    farmaciaId: r.businessId,
    farmaciaNombre: r.business?.name ?? null,
    activo: r.active,
    createdAt: r.createdAt.toISOString(),
  };
}

export class UserAccountRepositoryPrisma implements UserAccountRepository {
  async list() {
    const rows = await prisma.user.findMany({ select: SELECT, orderBy: [{ name: 'asc' }] });
    return rows.map(mapRow);
  }

  async findById(id: string) {
    const r = await prisma.user.findUnique({ where: { id }, select: SELECT });
    return r ? mapRow(r) : null;
  }

  async emailExists(email: string, exceptId?: string) {
    const r = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, ...(exceptId ? { id: { not: exceptId } } : {}) },
      select: { id: true },
    });
    return !!r;
  }

  async getPasswordHash(id: string) {
    const r = await prisma.user.findUnique({ where: { id }, select: { passwordHash: true } });
    return r?.passwordHash ?? null;
  }

  async create(input: Parameters<UserAccountRepository['create']>[0]) {
    const r = await prisma.user.create({
      data: {
        name: input.nombre,
        email: input.email,
        role: A_DB[input.rol],
        businessId: input.farmaciaId,
        passwordHash: input.passwordHash,
      },
      select: SELECT,
    });
    return mapRow(r);
  }

  async update(id: string, input: Parameters<UserAccountRepository['update']>[1], opts?: OpcionesEscrituraAdmin) {
    const r = await escribirGuardandoAdmin(id, opts, (tx) => tx.user.update({
      where: { id },
      data: {
        ...(input.nombre !== undefined ? { name: input.nombre } : {}),
        ...(input.rol !== undefined ? { role: A_DB[input.rol] } : {}),
        ...(input.farmaciaId !== undefined ? { businessId: input.farmaciaId } : {}),
      },
      select: SELECT,
    }));
    return mapRow(r);
  }

  async setActive(id: string, activo: boolean, opts?: OpcionesEscrituraAdmin) {
    const r = await escribirGuardandoAdmin(id, opts, (tx) =>
      tx.user.update({ where: { id }, data: { active: activo }, select: SELECT }),
    );
    return mapRow(r);
  }

  async setPasswordHash(id: string, hash: string) {
    await prisma.user.update({ where: { id }, data: { passwordHash: hash } });
  }

  async countActiveAdmins(exceptId?: string) {
    return prisma.user.count({
      where: { role: 'SUPER_ADMIN', active: true, ...(exceptId ? { id: { not: exceptId } } : {}) },
    });
  }

  async listFarmacias() {
    const rows = await prisma.business.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
    return rows.map((b) => ({ id: b.id, nombre: b.name }));
  }

  async farmaciaExists(id: string) {
    return !!(await prisma.business.findUnique({ where: { id }, select: { id: true } }));
  }
}
