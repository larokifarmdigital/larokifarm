/**
 * Use cases del CRUD de usuarios.
 *
 * Reciben el `actor` (sesión) para aplicar reglas RBAC:
 *  - SUPER_ADMIN puede todo.
 *  - BUSINESS_ADMIN solo opera sobre usuarios de SU negocio y NO puede crear
 *    ni promover a SUPER_ADMIN.
 *  - USER no entra en estos endpoints.
 *
 * El scoping de lectura/escritura se aplica en el repo vía `Scope`.
 */
import type { Session } from 'next-auth';
import { ForbiddenError, ValidationError, scopeFromSession } from '@/core/shared';
import type {
  CreateUserInput,
  UpdateUserInput,
  UserRepository,
  UserRow,
} from '../domain';

function assertAdmin(actor: Session) {
  if (actor.user.role !== 'SUPER_ADMIN' && actor.user.role !== 'BUSINESS_ADMIN') {
    throw new ForbiddenError('Solo administradores pueden gestionar usuarios.');
  }
}

export class ListUsersUseCase {
  constructor(private readonly repo: UserRepository) {}
  async execute(actor: Session): Promise<UserRow[]> {
    assertAdmin(actor);
    return this.repo.list(scopeFromSession(actor));
  }
}

export class CreateUserUseCase {
  constructor(private readonly repo: UserRepository) {}
  async execute(actor: Session, input: CreateUserInput): Promise<UserRow> {
    assertAdmin(actor);

    if (!input.email || !input.password || !input.name) {
      throw new ValidationError('Email, contraseña y nombre son obligatorios.');
    }
    if (input.password.length < 8) {
      throw new ValidationError('La contraseña debe tener al menos 8 caracteres.');
    }

    let effective: CreateUserInput = { ...input };

    if (actor.user.role === 'BUSINESS_ADMIN') {
      if (!actor.user.businessId) {
        throw new ForbiddenError('Tu cuenta no tiene negocio asignado.');
      }
      // BUSINESS_ADMIN solo puede crear USER (no otros admins).
      if (effective.role !== 'USER') {
        throw new ForbiddenError(
          'Solo puedes crear usuarios operativos (rol Usuario).',
        );
      }
      // Forzar el businessId del actor: BUSINESS_ADMIN solo crea en su negocio.
      effective.businessId = actor.user.businessId;
    }

    // SUPER_ADMIN puede crear USER/BUSINESS_ADMIN sin businessId; lo aceptamos.
    return this.repo.create(effective);
  }
}

export class UpdateUserUseCase {
  constructor(private readonly repo: UserRepository) {}
  async execute(
    actor: Session,
    id: string,
    input: UpdateUserInput,
  ): Promise<UserRow> {
    assertAdmin(actor);

    if (input.password !== undefined && input.password.length < 8) {
      throw new ValidationError('La contraseña debe tener al menos 8 caracteres.');
    }

    const effective: UpdateUserInput = { ...input };
    if (actor.user.role === 'BUSINESS_ADMIN') {
      if (effective.role !== undefined && effective.role !== 'USER') {
        throw new ForbiddenError(
          'Solo puedes asignar el rol Usuario a los usuarios de tu negocio.',
        );
      }
      // BUSINESS_ADMIN no puede mover usuarios entre negocios
      delete effective.businessId;
    }

    return this.repo.update(scopeFromSession(actor), id, effective);
  }
}

export class DeleteUserUseCase {
  constructor(private readonly repo: UserRepository) {}
  async execute(actor: Session, id: string): Promise<void> {
    assertAdmin(actor);
    if (actor.user.id === id) {
      throw new ForbiddenError('No puedes eliminar tu propia cuenta.');
    }
    return this.repo.delete(scopeFromSession(actor), id);
  }
}
