'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { contentRepository } from '@/lib/content-repository';
import { requireUser } from '@/lib/session';
import { slugify } from '@/lib/utils';

export async function duplicateFarmaciaAction(id: string) {
  await requireUser();
  await contentRepository.duplicateFarmacia(id);
  revalidatePath('/farmacias');
}

export async function archiveFarmaciaAction(id: string) {
  await requireUser();
  await contentRepository.archiveFarmacia(id);
  revalidatePath('/farmacias');
}

export async function publishFarmaciaAction(id: string, publish: boolean) {
  await requireUser();
  await contentRepository.publishFarmacia(id, publish ? 'published' : 'draft');
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
  const nombre = String(formData.get('nombre') ?? '').trim();
  const ciudad = String(formData.get('ciudad') ?? '').trim();
  const rawSlug = String(formData.get('slug') ?? '').trim();

  const fieldErrors: Record<string, string> = {};
  if (nombre.length < 2) fieldErrors.nombre = 'Nombre muy corto';
  const slug = rawSlug ? slugify(rawSlug) : slugify(nombre);
  if (!slug) fieldErrors.slug = 'Slug requerido';
  if (Object.keys(fieldErrors).length > 0) {
    return { status: 'error', message: 'Revisa los campos', fieldErrors };
  }

  const res = await contentRepository.createFarmacia({ nombre, slug, ciudad });
  if (!res.ok) {
    return {
      status: 'error',
      message: res.error,
      fieldErrors: res.fieldErrors,
    };
  }

  revalidatePath('/farmacias');
  redirect(`/farmacias/${res.data.id}`);
}
