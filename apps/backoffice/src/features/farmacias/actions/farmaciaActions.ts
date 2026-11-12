'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/core/auth';
import { CreateFarmaciaUseCase, getFarmaciaRepository } from '@/core/farmacias';

export async function duplicateFarmaciaAction(id: string) {
  await requireUser();
  await getFarmaciaRepository().duplicateFarmacia(id);
  revalidatePath('/farmacias');
}

export async function archiveFarmaciaAction(id: string) {
  await requireUser();
  await getFarmaciaRepository().archiveFarmacia(id);
  revalidatePath('/farmacias');
}

export async function publishFarmaciaAction(id: string, publish: boolean) {
  await requireUser();
  await getFarmaciaRepository().publishFarmacia(id, publish ? 'published' : 'draft');
  revalidatePath('/farmacias');
  revalidatePath(`/farmacias/${id}`);
}

export type CreateFarmaciaState =
  | { status: 'idle' }
  | { status: 'error'; message: string; fieldErrors?: Record<string, string> };

export async function createFarmaciaAction(
  _prev: CreateFarmaciaState,
  formData: FormData,
): Promise<CreateFarmaciaState> {
  await requireUser();
  const res = await new CreateFarmaciaUseCase(getFarmaciaRepository()).execute({
    nombre: String(formData.get('nombre') ?? ''),
    ciudad: String(formData.get('ciudad') ?? ''),
    slug: String(formData.get('slug') ?? ''),
    idiomas: formData.getAll('idiomas').map(String),
  });
  if (!res.ok) {
    return { status: 'error', message: res.error, fieldErrors: res.fieldErrors };
  }

  revalidatePath('/farmacias');
  redirect(`/farmacias/${res.data.id}`);
}
