'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/features/auth';
import { getBusinessRepository } from '@/shared/core';
import {
  CreateBusinessUseCase,
  DeleteBusinessUseCase,
  ForbiddenError,
  SetGeminiApiKeyUseCase,
  UpdateBusinessUseCase,
  ValidationError,
} from '../core';

export interface BusinessActionState {
  ok?: boolean;
  error?: string;
}

function handleError(e: unknown): BusinessActionState {
  if (e instanceof ForbiddenError || e instanceof ValidationError) {
    return { error: e.message };
  }
  if (e instanceof Error && /Unique constraint/.test(e.message)) {
    return { error: 'Ya existe un negocio con ese slug.' };
  }
  return { error: e instanceof Error ? e.message : 'Error desconocido' };
}

export async function createBusinessAction(
  _prev: BusinessActionState,
  form: FormData,
): Promise<BusinessActionState> {
  try {
    const session = await auth();
    if (!session?.user) return { error: 'No autenticado.' };

    const useCase = new CreateBusinessUseCase(getBusinessRepository());
    await useCase.execute(session, {
      slug: String(form.get('slug') ?? '').trim().toLowerCase(),
      name: String(form.get('name') ?? '').trim(),
    });
    revalidatePath('/admin/negocios');
    return { ok: true };
  } catch (e) {
    return handleError(e);
  }
}

export async function updateBusinessAction(
  _prev: BusinessActionState,
  form: FormData,
): Promise<BusinessActionState> {
  try {
    const session = await auth();
    if (!session?.user) return { error: 'No autenticado.' };

    const id = String(form.get('id') ?? '');
    if (!id) return { error: 'Falta id del negocio.' };

    const useCase = new UpdateBusinessUseCase(getBusinessRepository());
    await useCase.execute(session, id, {
      name: form.get('name') !== null ? String(form.get('name')).trim() : undefined,
    });
    revalidatePath('/admin/negocios');
    return { ok: true };
  } catch (e) {
    return handleError(e);
  }
}

export async function setGeminiApiKeyAction(
  _prev: BusinessActionState,
  form: FormData,
): Promise<BusinessActionState> {
  try {
    const session = await auth();
    if (!session?.user) return { error: 'No autenticado.' };

    const id = String(form.get('id') ?? '');
    if (!id) return { error: 'Falta id del negocio.' };

    const useCase = new SetGeminiApiKeyUseCase(getBusinessRepository());
    await useCase.execute(session, id, String(form.get('apiKey') ?? ''));
    revalidatePath('/admin/negocios');
    return { ok: true };
  } catch (e) {
    return handleError(e);
  }
}

export async function deleteBusinessAction(id: string): Promise<BusinessActionState> {
  try {
    const session = await auth();
    if (!session?.user) return { error: 'No autenticado.' };

    const useCase = new DeleteBusinessUseCase(getBusinessRepository());
    await useCase.execute(session, id);
    revalidatePath('/admin/negocios');
    return { ok: true };
  } catch (e) {
    return handleError(e);
  }
}
