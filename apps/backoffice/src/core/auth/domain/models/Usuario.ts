export type Usuario = {
  id: string;
  email: string;
  nombre: string;
  rol: 'admin' | 'manager' | 'viewer';
  /** Farmacia principal (la que usa el conciliador antiguo). */
  farmaciaId?: string;
  /** Todas las farmacias que lleva, la principal incluida. */
  farmaciaIds: string[];
  createdAt: string;
};

/** `viewer` (rol USER) es de solo lectura: ve su farmacia pero no la cambia. */
export function canEditContent(u: Pick<Usuario, 'rol'>): boolean {
  return u.rol !== 'viewer';
}

export const READ_ONLY_ERROR = 'Tu usuario es de solo lectura.';

/** ÚNICO punto para decidir si un Usuario puede tocar una farmacia. */
export function puedeAccederFarmaciaUsuario(
  u: Pick<Usuario, 'rol' | 'farmaciaIds'>,
  businessId: string | null | undefined,
): boolean {
  if (!businessId) return false;
  return u.rol === 'admin' || u.farmaciaIds.includes(businessId);
}
