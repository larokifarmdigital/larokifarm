import type {
  CreateUserAccountInput,
  FarmaciaOpcion,
  UpdateUserAccountInput,
  UserAccount,
} from '../models';

/** La escritura dejaría la app sin ningún administrador activo. */
export class UltimoAdminError extends Error {
  constructor() {
    super('Tiene que quedar al menos un administrador activo.');
  }
}

/** `exigirOtroAdminActivo`: comprobar y escribir en la misma transacción (lanza UltimoAdminError). */
export interface OpcionesEscrituraAdmin {
  exigirOtroAdminActivo?: boolean;
}

// Los checks de rol viven en los use cases (application/), no aquí.
export interface UserAccountRepository {
  list(): Promise<UserAccount[]>;
  findById(id: string): Promise<UserAccount | null>;
  emailExists(email: string, exceptId?: string): Promise<boolean>;
  getPasswordHash(id: string): Promise<string | null>;
  create(input: CreateUserAccountInput): Promise<UserAccount>;
  update(id: string, input: UpdateUserAccountInput, opts?: OpcionesEscrituraAdmin): Promise<UserAccount>;
  setActive(id: string, activo: boolean, opts?: OpcionesEscrituraAdmin): Promise<UserAccount>;
  setPasswordHash(id: string, hash: string): Promise<void>;
  /** Administradores activos, sin contar `exceptId`. */
  countActiveAdmins(exceptId?: string): Promise<number>;
  listFarmacias(): Promise<FarmaciaOpcion[]>;
  farmaciaExists(id: string): Promise<boolean>;
}
