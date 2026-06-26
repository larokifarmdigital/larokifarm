'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/features/auth';
import { getUserRepository, type Role } from '@/shared/core';
import {
  CreateUserUseCase,
  DeleteUserUseCase,
  ForbiddenError,
  UpdateUserUseCase,
  ValidationError,
} from '../core';

export interface UserActionState {
  ok?: boolean;
  error?: string;
}

const ROLES: Role[] = ['SUPER_ADMIN', 'BUSINESS_ADMIN', 'USER'];

function parseRole(raw: FormDataEntryValue | null): Role {
  const v = String(raw ?? '');
  if (!(ROLES as string[]).includes(v)) {
    throw new ValidationError('Rol inválido.');
  }
  return v as Role;
}

function nullable(raw: FormDataEntryValue | null): string | null {
  const v = String(raw ?? '').trim();
  return v.length === 0 ? null : v;
}

function handleError(e: unknown): UserActionState {
  if (e instanceof ForbiddenError || e instanceof ValidationError) {
    return { error: e.message };
  }
  if (e instanceof Error && /Unique constraint/.test(e.message)) {
    return { error: 'Ya existe un usuario con ese email.' };
  }
  return { error: e instanceof Error ? e.message : 'Error desconocido' };
}

export async function createUserAction(
  _prev: UserActionState,
  form: FormData,
): Promise<UserActionState> {
  try {
    const session = await auth();
    if (!session?.user) return { error: 'No autenticado.' };

    const useCase = new CreateUserUseCase(getUserRepository());
    await useCase.execute(session, {
      email: String(form.get('email') ?? ''),
      name: String(form.get('name') ?? ''),
      password: String(form.get('password') ?? ''),
      role: parseRole(form.get('role')),
      businessId: nullable(form.get('businessId')),
    });
    revalidatePath('/admin/usuarios');
    return { ok: true };
  } catch (e) {
    return handleError(e);
  }
}

export async function updateUserAction(
  _prev: UserActionState,
  form: FormData,
): Promise<UserActionState> {
  try {
    const session = await auth();
    if (!session?.user) return { error: 'No autenticado.' };

    const id = String(form.get('id') ?? '');
    if (!id) return { error: 'Falta id del usuario.' };

    const password = String(form.get('password') ?? '').trim();

    const useCase = new UpdateUserUseCase(getUserRepository());
    await useCase.execute(session, id, {
      name: form.get('name') !== null ? String(form.get('name')) : undefined,
      role: form.get('role') !== null ? parseRole(form.get('role')) : undefined,
      businessId:
        form.get('businessId') !== null ? nullable(form.get('businessId')) : undefined,
      active:
        form.get('active') !== null ? String(form.get('active')) === 'true' : undefined,
      password: password.length > 0 ? password : undefined,
    });
    revalidatePath('/admin/usuarios');
    return { ok: true };
  } catch (e) {
    return handleError(e);
  }
}

export async function deleteUserAction(id: string): Promise<UserActionState> {
  try {
    const session = await auth();
    if (!session?.user) return { error: 'No autenticado.' };

    const useCase = new DeleteUserUseCase(getUserRepository());
    await useCase.execute(session, id);
    revalidatePath('/admin/usuarios');
    return { ok: true };
  } catch (e) {
    return handleError(e);
  }
}
