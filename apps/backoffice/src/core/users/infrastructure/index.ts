import type { UserAccountRepository } from '../domain';
import { UserAccountRepositoryPrisma } from './UserAccountRepositoryPrisma';

let cached: UserAccountRepository | null = null;
export function getUserAccountRepository(): UserAccountRepository {
  if (!cached) cached = new UserAccountRepositoryPrisma();
  return cached;
}
