// NOTE: passwordHash solo se expone en `UserForAuth`, no en las shapes públicas.
import type { Role } from '@/core/shared';

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
  businessSlug: string | null;
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
