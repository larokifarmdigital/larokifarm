import type { Role } from '@prisma/client';

export { type Role };

export type Scope =
  | { kind: 'all' } // SUPER_ADMIN
  | { kind: 'business'; businessIds: string[] } // personal de farmacia (BUSINESS_ADMIN y USER)
  | { kind: 'user'; userId: string; businessIds: string[] }; // sin uso desde 24-11-2026

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
  // Todo el personal de una farmacia ve TODAS sus conciliaciones, edite o no
  // la web (decisión de gestión 24-11-2026; antes "solo consulta" veía solo
  // las suyas). El tipo 'user' se mantiene por si vuelve a hacer falta.
  return { kind: 'business', businessIds };
}
