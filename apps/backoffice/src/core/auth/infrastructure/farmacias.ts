// Pertenencia a farmacias leída de la BD (no del JWT, que puede tener hasta
// AUTH_RECHECK_MS de retraso). Para operaciones caras o con coste (conciliar).
import { prisma } from '@/shared/lib/prisma';

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
