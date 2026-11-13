export type Usuario = {
  id: string;
  email: string;
  nombre: string;
  rol: 'admin' | 'manager' | 'viewer';
  farmaciaId?: string;
  createdAt: string;
};

/** `viewer` (rol USER) es de solo lectura: ve su farmacia pero no la cambia. */
export function canEditContent(u: Pick<Usuario, 'rol'>): boolean {
  return u.rol !== 'viewer';
}

export const READ_ONLY_ERROR = 'Tu usuario es de solo lectura.';
