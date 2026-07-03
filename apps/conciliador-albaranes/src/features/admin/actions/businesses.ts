'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/core/auth';
import { ForbiddenError, ValidationError } from '@/core/shared';
import {
  CreateBusinessUseCase,
  DeleteBusinessUseCase,
  SetGeminiApiKeyUseCase,
  UpdateBusinessUseCase,
  getBusinessRepository,
} from '@/core/businesses';

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

    let monthlyBudgetUsd: number | null | undefined = undefined;
    const rawBudget = form.get('monthlyBudgetUsd');
    if (rawBudget !== null) {
      const s = String(rawBudget).trim();
      if (s === '') {
        monthlyBudgetUsd = null;
      } else {
        const n = Number(s.replace(',', '.'));
        if (!Number.isFinite(n) || n < 0) {
          return { error: 'El presupuesto mensual debe ser un número ≥ 0.' };
        }
        monthlyBudgetUsd = n;
      }
    }

    let supportEmail: string | null | undefined = undefined;
    const rawEmail = form.get('supportEmail');
    if (rawEmail !== null) {
      const s = String(rawEmail).trim();
      supportEmail = s === '' ? null : s;
    }

    const useCase = new UpdateBusinessUseCase(getBusinessRepository());
    await useCase.execute(session, id, {
      name: form.get('name') !== null ? String(form.get('name')).trim() : undefined,
      monthlyBudgetUsd,
      supportEmail,
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
