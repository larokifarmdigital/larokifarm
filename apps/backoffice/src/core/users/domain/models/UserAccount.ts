/** Rol de una cuenta, con los mismos nombres que `Usuario.rol` (core/auth). */
export type RolCuenta = 'admin' | 'manager' | 'viewer';

export const ROLES_CUENTA: readonly RolCuenta[] = ['admin', 'manager', 'viewer'];

/** Cuenta tal y como la ve el administrador en Ajustes → Usuarios (sin hash). */
export interface UserAccount {
  id: string;
  nombre: string;
  email: string;
  rol: RolCuenta;
  farmaciaId: string | null;
  farmaciaNombre: string | null;
  activo: boolean;
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
  farmaciaId: string | null;
  passwordHash: string;
}

export interface UpdateUserAccountInput {
  nombre?: string;
  rol?: RolCuenta;
  farmaciaId?: string | null;
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
