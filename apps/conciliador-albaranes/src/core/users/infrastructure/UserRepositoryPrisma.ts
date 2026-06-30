import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/lib/prisma';
import type { Scope } from '@/core/shared';
import type {
  CreateUserInput,
  UpdateUserInput,
  UserForAuth,
  UserRow,
} from '../domain/models/User';
import type { UserRepository } from '../domain/repositories/UserRepository';

const BCRYPT_ROUNDS = 10;

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  businessId: true,
  active: true,
  createdAt: true,
  updatedAt: true,
  business: { select: { slug: true, name: true } },
} satisfies Prisma.UserSelect;

function whereFromScope(scope: Scope): Prisma.UserWhereInput {
  switch (scope.kind) {
    case 'all':
      return {};
    case 'business':
      return { businessId: scope.businessId };
    case 'user':
      // USER puede leerse a sí mismo, nada más.
      return { id: scope.userId };
  }
}

export class UserRepositoryPrisma implements UserRepository {
  async list(scope: Scope): Promise<UserRow[]> {
    return prisma.user.findMany({
      where: whereFromScope(scope),
      orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
      select: USER_SELECT,
    });
  }

  async findById(scope: Scope, id: string): Promise<UserRow | null> {
    return prisma.user.findFirst({
      where: { ...whereFromScope(scope), id },
      select: USER_SELECT,
    });
  }

  async findByEmailForAuth(email: string): Promise<UserForAuth | null> {
    const row = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        businessId: true,
        passwordHash: true,
        active: true,
      },
    });
    return row;
  }

  async create(input: CreateUserInput): Promise<UserRow> {
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    return prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        name: input.name,
        passwordHash,
        role: input.role,
        businessId: input.businessId,
      },
      select: USER_SELECT,
    });
  }

  async update(scope: Scope, id: string, input: UpdateUserInput): Promise<UserRow> {
    // Scoping: solo permitimos updates dentro del scope. Si la fila no está en scope
    // dejamos que Prisma lance P2025 (record not found).
    const target = await prisma.user.findFirst({
      where: { ...whereFromScope(scope), id },
      select: { id: true },
    });
    if (!target) {
      throw new Error('Usuario no encontrado o sin permiso para modificarlo.');
    }

    const data: Prisma.UserUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.role !== undefined) data.role = input.role;
    if (input.businessId !== undefined) {
      data.business = input.businessId
        ? { connect: { id: input.businessId } }
        : { disconnect: true };
    }
    if (input.active !== undefined) data.active = input.active;
    if (input.password) {
      data.passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    }

    return prisma.user.update({
      where: { id },
      data,
      select: USER_SELECT,
    });
  }

  async delete(scope: Scope, id: string): Promise<void> {
    const target = await prisma.user.findFirst({
      where: { ...whereFromScope(scope), id },
      select: { id: true },
    });
    if (!target) {
      throw new Error('Usuario no encontrado o sin permiso para eliminarlo.');
    }
    await prisma.user.delete({ where: { id } });
  }
}
