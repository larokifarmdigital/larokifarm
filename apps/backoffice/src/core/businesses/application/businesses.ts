// NOTE: SUPER_ADMIN puede crear/borrar; BUSINESS_ADMIN solo edita su propio negocio; USER no entra.
import type { Session } from 'next-auth';
import { ForbiddenError, ValidationError } from '@/core/shared';
import type {
  BusinessRepository,
  BusinessRow,
  CreateBusinessInput,
  UpdateBusinessInput,
} from '../domain';

function assertSuperAdmin(actor: Session) {
  if (actor.user.role !== 'SUPER_ADMIN') {
    throw new ForbiddenError('Solo SUPER_ADMIN puede gestionar negocios.');
  }
}

function assertCanEditBusiness(actor: Session, businessId: string) {
  if (actor.user.role === 'SUPER_ADMIN') return;
  if (actor.user.role === 'BUSINESS_ADMIN' && actor.user.businessId === businessId) return;
  throw new ForbiddenError('No puedes editar este negocio.');
}

export class ListBusinessesUseCase {
  constructor(private readonly repo: BusinessRepository) {}
  async execute(actor: Session): Promise<BusinessRow[]> {
    if (actor.user.role === 'SUPER_ADMIN') return this.repo.list();
    if (actor.user.role === 'BUSINESS_ADMIN' && actor.user.businessId) {
      const b = await this.repo.findById(actor.user.businessId);
      return b ? [b] : [];
    }
    return [];
  }
}

export class CreateBusinessUseCase {
  constructor(private readonly repo: BusinessRepository) {}
  async execute(actor: Session, input: CreateBusinessInput): Promise<BusinessRow> {
    assertSuperAdmin(actor);
    if (!input.slug.match(/^[a-z0-9-]+$/)) {
      throw new ValidationError(
        'El slug solo admite minúsculas, dígitos y guiones (ej. "torrents").',
      );
    }
    if (!input.name.trim()) {
      throw new ValidationError('El nombre es obligatorio.');
    }
    const existing = await this.repo.findBySlug(input.slug);
    if (existing) {
      throw new ValidationError(`Ya existe un negocio con el slug "${input.slug}".`);
    }
    return this.repo.create(input);
  }
}

export class UpdateBusinessUseCase {
  constructor(private readonly repo: BusinessRepository) {}
  async execute(
    actor: Session,
    id: string,
    input: UpdateBusinessInput,
  ): Promise<BusinessRow> {
    assertCanEditBusiness(actor, id);
    if (input.name !== undefined && !input.name.trim()) {
      throw new ValidationError('El nombre no puede estar vacío.');
    }
    // NOTE: budget y supportEmail solo SUPER_ADMIN. BUSINESS_ADMIN los recibiría en el form pero no debe poder tocarlos.
    if (
      (input.monthlyBudgetUsd !== undefined || input.supportEmail !== undefined) &&
      actor.user.role !== 'SUPER_ADMIN'
    ) {
      throw new ForbiddenError(
        'Solo SUPER_ADMIN puede modificar el presupuesto y el email de soporte.',
      );
    }
    return this.repo.update(id, input);
  }
}

export class DeleteBusinessUseCase {
  constructor(private readonly repo: BusinessRepository) {}
  async execute(actor: Session, id: string): Promise<void> {
    assertSuperAdmin(actor);
    return this.repo.delete(id);
  }
}

// NOTE: string vacío = limpiar la key (vuelve al fallback global).
export class SetGeminiApiKeyUseCase {
  constructor(private readonly repo: BusinessRepository) {}
  async execute(
    actor: Session,
    businessId: string,
    apiKey: string,
  ): Promise<BusinessRow> {
    assertCanEditBusiness(actor, businessId);
    const trimmed = apiKey.trim();
    return this.repo.update(businessId, {
      geminiApiKey: trimmed.length === 0 ? null : trimmed,
    });
  }
}
