import { tieneModulo, type Modulo } from '@/core/shared';

export type Usuario = {
  id: string;
  email: string;
  nombre: string;
  rol: 'admin' | 'manager' | 'viewer';
  /** Farmacia principal (la que usa el conciliador antiguo). */
  farmaciaId?: string;
  /** Todas las farmacias que lleva, la principal incluida. */
  farmaciaIds: string[];
  /** Módulos activados por el administrador. Para decidir, usa `usuarioTieneModulo`. */
  modulos: Modulo[];
  createdAt: string;
};

/** `viewer` (rol USER) es de solo lectura: ve su farmacia pero no la cambia. */
export function canEditContent(u: Pick<Usuario, 'rol'>): boolean {
  return u.rol !== 'viewer';
}

/**
 * La web en el backoffice es "editarla o nada" (24-11-2026): sin "Editar la
 * web" (rol viewer) no ve ni el menú, ni la tarjeta de Inicio, ni el editor.
 */
export function veLaWeb(u: Pick<Usuario, 'rol'>): boolean {
  return canEditContent(u);
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

export function usuarioTieneModulo(u: Pick<Usuario, 'rol' | 'modulos'>, m: Modulo): boolean {
  return tieneModulo({ esAdmin: u.rol === 'admin', modulos: u.modulos }, m);
}
