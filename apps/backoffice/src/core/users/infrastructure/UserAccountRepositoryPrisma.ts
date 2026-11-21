import { Prisma, type Role } from '@prisma/client';
import { prisma } from '@/shared/lib/prisma';
import {
  CuentaConHistorialError,
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
  business: { select: { id: true, name: true } },
  farmacias: { select: { business: { select: { id: true, name: true } } } },
  _count: { select: { comparisons: true, reportsCreated: true, reportsResolved: true, batchJobs: true, usage: true } },
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

/**
 * Sustituye las farmacias de un usuario y ajusta la principal (`businessId`):
 * se mantiene si sigue en la lista; si no, pasa a ser la primera (o ninguna).
 */
async function escribirFarmacias(tx: Tx, userId: string, ids: string[], principalActual: string | null) {
  await tx.userBusiness.deleteMany({ where: { userId, businessId: { notIn: ids } } });
  if (ids.length > 0) {
    await tx.userBusiness.createMany({ data: ids.map((businessId) => ({ userId, businessId })), skipDuplicates: true });
  }
  const principal = principalActual && ids.includes(principalActual) ? principalActual : (ids[0] ?? null);
  if (principal !== principalActual) await tx.user.update({ where: { id: userId }, data: { businessId: principal } });
}

function mapRow(r: Row): UserAccount {
  return {
    id: r.id,
    nombre: r.name,
    email: r.email,
    rol: DE_DB[r.role],
    farmaciaId: r.businessId,
    // La principal cuenta aunque le falte su fila en user_businesses.
    farmacias: [...new Map([...(r.business ? [r.business] : []), ...r.farmacias.map((f) => f.business)].map((b) => [b.id, b])).values()]
      .map((b) => ({ id: b.id, nombre: b.name }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    activo: r.active,
    tieneHistorial: Object.values(r._count).some((n) => n > 0),
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
    const r = await prisma.$transaction(async (tx) => {
      const creado = await tx.user.create({
        data: {
          name: input.nombre,
          email: input.email,
          role: A_DB[input.rol],
          businessId: input.farmaciaIds[0] ?? null,
          passwordHash: input.passwordHash,
        },
        select: { id: true },
      });
      await escribirFarmacias(tx, creado.id, input.farmaciaIds, input.farmaciaIds[0] ?? null);
      return tx.user.findUniqueOrThrow({ where: { id: creado.id }, select: SELECT });
    });
    return mapRow(r);
  }

  async update(id: string, input: Parameters<UserAccountRepository['update']>[1], opts?: OpcionesEscrituraAdmin) {
    const escribir = async (tx: Tx) => {
      const antes = await tx.user.update({
        where: { id },
        data: {
          ...(input.nombre !== undefined ? { name: input.nombre } : {}),
          ...(input.rol !== undefined ? { role: A_DB[input.rol] } : {}),
        },
        select: { businessId: true },
      });
      if (input.farmaciaIds !== undefined) await escribirFarmacias(tx, id, input.farmaciaIds, antes.businessId);
      return tx.user.findUniqueOrThrow({ where: { id }, select: SELECT });
    };
    // Sin la comprobación de administradores también va en transacción: datos y farmacias a la vez.
    const r = opts?.exigirOtroAdminActivo
      ? await escribirGuardandoAdmin(id, opts, escribir)
      : await prisma.$transaction(escribir);
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

  async delete(id: string, opts?: OpcionesEscrituraAdmin) {
    const borrar = async (tx: Tx) => {
      // Se vuelve a mirar dentro de la transacción: pudo conciliar entre medias.
      const c = await tx.user.findUnique({ where: { id }, select: { _count: SELECT._count } });
      if (!c) return;
      if (Object.values(c._count).some((n) => n > 0)) throw new CuentaConHistorialError();
      await tx.user.delete({ where: { id } });
    };
    try {
      if (opts?.exigirOtroAdminActivo) await escribirGuardandoAdmin(id, opts, borrar);
      else await prisma.$transaction(borrar);
    } catch (e) {
      // Clave foránea: alguna tabla la referencia (historial creado en la carrera).
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') throw new CuentaConHistorialError();
      throw e;
    }
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

  async farmaciasExisten(ids: string[]) {
    if (ids.length === 0) return true;
    return (await prisma.business.count({ where: { id: { in: ids } } })) === ids.length;
  }
}
