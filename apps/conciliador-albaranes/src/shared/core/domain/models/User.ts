/**
 * Modelo de User.
 *
 * El `passwordHash` solo aparece en queries internas de auth — NUNCA en las
 * shapes públicas (`UserRow`). Para verificar credenciales se usa
 * `UserRepository.findByEmailForAuth` que sí lo devuelve.
 */
import type { Role } from './Comparison';

export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  businessId: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  business: { slug: string; name: string } | null;
}

export interface UserForAuth {
  id: string;
  email: string;
  name: string;
  role: Role;
  businessId: string | null;
  passwordHash: string;
  active: boolean;
}

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role: Role;
  businessId: string | null;
}

export interface UpdateUserInput {
  name?: string;
  role?: Role;
  businessId?: string | null;
  active?: boolean;
  /** Si se pasa, se hashea y se actualiza. */
  password?: string;
}
