import type { Role } from '@prisma/client';

export { type Role };

export type Scope =
  | { kind: 'all' } // SUPER_ADMIN
  | { kind: 'business'; businessIds: string[] } // BUSINESS_ADMIN
  | { kind: 'user'; userId: string; businessIds: string[] }; // USER

type SesionConFarmacias = {
  user: { id: string; role: Role; businessId: string | null; businessIds?: string[] };
};

/** Farmacias de la sesión (la principal incluida). Vacío = no ve ninguna. */
export function farmaciasDeSesion(session: SesionConFarmacias): string[] {
  const ids = new Set(session.user.businessIds ?? []);
  if (session.user.businessId) ids.add(session.user.businessId);
  return [...ids];
}

/** ÚNICO punto para decidir si una sesión puede tocar una farmacia. */
export function puedeAccederFarmacia(session: SesionConFarmacias, businessId: string | null | undefined): boolean {
  if (!businessId) return false;
  if (session.user.role === 'SUPER_ADMIN') return true;
  return farmaciasDeSesion(session).includes(businessId);
}

export function scopeFromSession(session: SesionConFarmacias): Scope {
  const role = session.user.role;
  if (role === 'SUPER_ADMIN') return { kind: 'all' };
  const businessIds = farmaciasDeSesion(session);
  if (role === 'BUSINESS_ADMIN') return { kind: 'business', businessIds };
  return { kind: 'user', userId: session.user.id, businessIds };
}
