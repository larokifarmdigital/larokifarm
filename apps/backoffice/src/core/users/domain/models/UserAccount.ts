import type { Modulo } from '@/core/shared';

/** Rol de una cuenta, con los mismos nombres que `Usuario.rol` (core/auth). */
export type RolCuenta = 'admin' | 'manager' | 'viewer';

export const ROLES_CUENTA: readonly RolCuenta[] = ['admin', 'manager', 'viewer'];

/** Cuenta tal y como la ve el administrador en Ajustes → Usuarios (sin hash). */
export interface UserAccount {
  id: string;
  nombre: string;
  email: string;
  rol: RolCuenta;
  /** Farmacia principal; siempre está en `farmacias` si no es null. */
  farmaciaId: string | null;
  /** Todas las farmacias que lleva, ordenadas por nombre. Mismo rol en todas. */
  farmacias: FarmaciaOpcion[];
  /** Módulos activados (el administrador los tiene todos aunque la lista esté vacía). */
  modulos: Modulo[];
  activo: boolean;
  /** Tiene conciliaciones, reportes o uso de IA a su nombre: no se puede eliminar, solo desactivar. */
  tieneHistorial: boolean;
  createdAt: string;
}

export interface FarmaciaOpcion {
  id: string;
  nombre: string;
}

export interface CreateUserAccountInput {
  nombre: string;
  email: string;
  rol: RolCuenta;
  farmaciaIds: string[];
  modulos: Modulo[];
  passwordHash: string;
}

export interface UpdateUserAccountInput {
  nombre?: string;
  rol?: RolCuenta;
  /** Sustituye la lista completa de farmacias. */
  farmaciaIds?: string[];
  modulos?: Modulo[];
}

/** Quien hace la operación (sesión). */
export interface ActorCuenta {
  id: string;
  rol: RolCuenta;
}

/** Contraseña recién generada: se devuelve UNA vez y nunca se guarda en claro. */
export interface CuentaConContrasena {
  cuenta: UserAccount;
  contrasenaTemporal: string;
}
