import type { Role } from '@prisma/client';

export { type Role };

export type Scope =
  | { kind: 'all' } // SUPER_ADMIN
  | { kind: 'business'; businessId: string } // BUSINESS_ADMIN
  | { kind: 'user'; userId: string }; // USER

export function scopeFromSession(session: {
  user: { id: string; role: Role; businessId: string | null };
}): Scope {
  const role = session.user.role;
  if (role === 'SUPER_ADMIN') return { kind: 'all' };
  if (role === 'BUSINESS_ADMIN') {
    if (!session.user.businessId) {
      // NOTE: BUSINESS_ADMIN sin negocio = scope vacío (no ve nada).
      return { kind: 'business', businessId: '__none__' };
    }
    return { kind: 'business', businessId: session.user.businessId };
  }
  return { kind: 'user', userId: session.user.id };
}
