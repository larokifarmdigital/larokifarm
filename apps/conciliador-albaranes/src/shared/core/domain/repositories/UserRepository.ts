import type { Scope } from '../models/Comparison';
import type {
  CreateUserInput,
  UpdateUserInput,
  UserForAuth,
  UserRow,
} from '../models/User';

/**
 * Port: contrato para CRUD de usuarios.
 *
 * El scoping por negocio se aplica en `list`/`findById` para que
 * BUSINESS_ADMIN solo vea su negocio.
 *
 * `findByEmailForAuth` es la única operación que devuelve `passwordHash` —
 * la usa exclusivamente Auth.js al verificar credenciales.
 */
export interface UserRepository {
  list(scope: Scope): Promise<UserRow[]>;
  findById(scope: Scope, id: string): Promise<UserRow | null>;
  findByEmailForAuth(email: string): Promise<UserForAuth | null>;
  create(input: CreateUserInput): Promise<UserRow>;
  update(scope: Scope, id: string, input: UpdateUserInput): Promise<UserRow>;
  delete(scope: Scope, id: string): Promise<void>;
}
