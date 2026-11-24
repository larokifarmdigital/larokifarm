'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/core/auth';
import { ConfigurarIaFarmaciaUseCase, getBusinessRepository, probarClaveGemini } from '@/core/businesses';
import type { SaveResult } from '@/core/shared';

const RUTA = '/admin/uso';
const casoDeUso = () => new ConfigurarIaFarmaciaUseCase(getBusinessRepository(), probarClaveGemini);

async function actor() {
  const u = await getCurrentUser();
  return u ? { rol: u.rol } : null;
}

function fin<T>(res: SaveResult<T>): SaveResult<T> {
  if (res.ok) revalidatePath(RUTA);
  return res;
}

export async function cambiarLimiteIaAction(businessId: string, limite: string): Promise<SaveResult<true>> {
  if (typeof businessId !== 'string' || typeof limite !== 'string') return { ok: false, error: 'Petición no válida.' };
  return fin(await casoDeUso().cambiarLimite(await actor(), businessId, limite));
}

export async function guardarClaveGeminiAction(businessId: string, clave: string): Promise<SaveResult<{ final: string }>> {
  if (typeof businessId !== 'string' || typeof clave !== 'string') return { ok: false, error: 'Petición no válida.' };
  return fin(await casoDeUso().guardarClave(await actor(), businessId, clave));
}

export async function quitarClaveGeminiAction(businessId: string): Promise<SaveResult<true>> {
  if (typeof businessId !== 'string') return { ok: false, error: 'Petición no válida.' };
  return fin(await casoDeUso().quitarClave(await actor(), businessId));
}
