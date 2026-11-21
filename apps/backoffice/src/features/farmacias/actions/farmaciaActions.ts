'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/core/auth';
import { getStorage } from '@/core/storage';
import {
  CreateFarmaciaUseCase,
  DeleteFarmaciaUseCase,
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
  const user = await requireUser();
  if (user.rol !== 'admin') return { ok: false, error: 'Solo un administrador puede archivar farmacias.' };
  const res = await getFarmaciaRepository().archiveFarmacia(id);
  if (res.ok) revalidatePath('/farmacias');
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}

export async function deleteFarmaciaAction(id: string): Promise<ActionResult> {
  await requireUser();
  const res = await new DeleteFarmaciaUseCase(getFarmaciaRepository(), getStorage()).execute(id);
  if (res.ok) revalidatePath('/farmacias');
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}

export type PublishFarmaciaResult =
  | { ok: true; deploy?: LandingDeployResult; farmacia: Farmacia }
  | { ok: false; error: string };

export async function publishFarmaciaAction(id: string, publish: boolean): Promise<PublishFarmaciaResult> {
  const user = await requireUser();
  if (user.rol !== 'admin') {
    // Sacar una farmacia del archivo (publicarla o pasarla a borrador) es cosa del administrador.
    const actual = await getFarmaciaRepository().getFarmacia(id);
    if (!actual) return { ok: false, error: 'Farmacia no encontrada' };
    if (actual.status === 'archived') {
      return { ok: false, error: 'Esta farmacia está archivada. Pide al administrador que la recupere.' };
    }
  }
  const res = await new PublishFarmaciaUseCase(getFarmaciaRepository(), getLandingDeployer()).execute(id, publish);
  revalidatePath('/farmacias');
  revalidatePath(`/farmacias/${id}`);
  return res.ok ? { ok: true, deploy: res.data.deploy, farmacia: res.data.farmacia } : { ok: false, error: res.error };
}

export type CreateFarmaciaState =
  | { status: 'idle' }
  | { status: 'ok'; id: string; nombre: string }
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
    responsableId: String(formData.get('responsable') ?? ''),
  });
  if (!res.ok) {
    return { status: 'error', message: res.error, fieldErrors: res.fieldErrors };
  }

  // Se crea desde un modal en /farmacias: nos quedamos en la lista (toast con "Abrir editor").
  revalidatePath('/farmacias');
  return { status: 'ok', id: res.data.id, nombre: res.data.nombre };
}
