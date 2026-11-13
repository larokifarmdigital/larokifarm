'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/core/auth';
import {
  CreateFarmaciaUseCase,
  PublishFarmaciaUseCase,
  getFarmaciaRepository,
  getLandingDeployer,
  type Farmacia,
  type LandingDeployResult,
} from '@/core/farmacias';

type ActionResult = { ok: true } | { ok: false; error: string };

export async function duplicateFarmaciaAction(id: string): Promise<ActionResult> {
  await requireUser();
  const res = await getFarmaciaRepository().duplicateFarmacia(id);
  if (res.ok) revalidatePath('/farmacias');
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}

export async function archiveFarmaciaAction(id: string): Promise<ActionResult> {
  await requireUser();
  const res = await getFarmaciaRepository().archiveFarmacia(id);
  if (res.ok) revalidatePath('/farmacias');
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}

export type PublishFarmaciaResult =
  | { ok: true; deploy?: LandingDeployResult; farmacia: Farmacia }
  | { ok: false; error: string };

export async function publishFarmaciaAction(id: string, publish: boolean): Promise<PublishFarmaciaResult> {
  await requireUser();
  const res = await new PublishFarmaciaUseCase(getFarmaciaRepository(), getLandingDeployer()).execute(id, publish);
  revalidatePath('/farmacias');
  revalidatePath(`/farmacias/${id}`);
  return res.ok ? { ok: true, deploy: res.data.deploy, farmacia: res.data.farmacia } : { ok: false, error: res.error };
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
