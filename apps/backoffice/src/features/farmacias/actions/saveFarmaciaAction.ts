'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/core/auth';
import { getFarmaciaRepository, parseFarmaciaPatch, type Farmacia } from '@/core/farmacias';
import type { SaveResult } from '@/core/shared';

/**
 * Autoguardado del editor. `patch` llega del cliente: se valida en el
 * servidor (`parseFarmaciaPatch`) — solo campos editables, nunca `status`.
 * `expectedUpdatedAt` = updatedAt que tenía el editor (control optimista).
 */
export async function saveFarmaciaPatchAction(
  id: string,
  patch: unknown,
  expectedUpdatedAt?: string,
): Promise<SaveResult<Farmacia>> {
  await requireUser();
  if (typeof id !== 'string') return { ok: false, error: 'Farmacia inválida' };
  const parsed = parseFarmaciaPatch(patch);
  if (!parsed.ok) return parsed;
  if (Object.keys(parsed.data).length === 0) {
    const current = await getFarmaciaRepository().getFarmacia(id);
    return current ? { ok: true, data: current } : { ok: false, error: 'Farmacia no encontrada' };
  }

  const res = await getFarmaciaRepository().saveFarmacia(id, parsed.data, {
    expectedUpdatedAt: typeof expectedUpdatedAt === 'string' ? expectedUpdatedAt : undefined,
  });
  if (res.ok) {
    revalidatePath('/farmacias');
    revalidatePath(`/farmacias/${id}`);
  }
  return res;
}
