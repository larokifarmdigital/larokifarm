// Pertenencia a farmacias leída de la BD (no del JWT, que puede tener hasta
// AUTH_RECHECK_MS de retraso). Para operaciones caras o con coste (conciliar).
import { prisma } from '@/shared/lib/prisma';
import { modulosDeDb, tieneModulo, type Modulo } from '@/core/shared';

/** Farmacias actuales de un usuario activo (la principal incluida). Vacío si está desactivado. */
export async function farmaciasActualesDe(userId: string): Promise<string[]> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { active: true, businessId: true, farmacias: { select: { businessId: true } } },
  });
  if (!u || !u.active) return [];
  const ids = new Set(u.farmacias.map((f) => f.businessId));
  if (u.businessId) ids.add(u.businessId);
  return [...ids];
}

/**
 * ¿Puede usar el módulo ahora mismo? Se lee de la BD (no del JWT) para que
 * quitar un módulo surta efecto al momento en páginas, acciones y APIs.
 */
export async function puedeUsarModulo(userId: string, modulo: Modulo): Promise<boolean> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { active: true, role: true, modules: true },
  });
  if (!u || !u.active) return false;
  return tieneModulo({ esAdmin: u.role === 'SUPER_ADMIN', modulos: modulosDeDb(u.modules) }, modulo);
}
