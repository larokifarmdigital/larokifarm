import type { Scope } from '@/core/shared';
import type {
  CreateUserInput,
  UpdateUserInput,
  UserForAuth,
  UserRow,
} from '../models/User';

// NOTE: findByEmailForAuth es la única operación que devuelve passwordHash — solo la usa Auth.js.
export interface UserRepository {
  list(scope: Scope): Promise<UserRow[]>;
  findById(scope: Scope, id: string): Promise<UserRow | null>;
  findByEmailForAuth(email: string): Promise<UserForAuth | null>;
  create(input: CreateUserInput): Promise<UserRow>;
  update(scope: Scope, id: string, input: UpdateUserInput): Promise<UserRow>;
  delete(scope: Scope, id: string): Promise<void>;
}
