import type { UserRepository } from '../domain/repositories/UserRepository';
import { UserRepositoryPrisma } from './UserRepositoryPrisma';

let cached: UserRepository | null = null;

export function getUserRepository(): UserRepository {
  if (!cached) cached = new UserRepositoryPrisma();
  return cached;
}
