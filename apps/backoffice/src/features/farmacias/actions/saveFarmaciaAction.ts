'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/core/auth';
import { getFarmaciaRepository, parseFarmaciaPatch, type Farmacia } from '@/core/farmacias';
import type { SaveResult } from '@/core/shared';

/** Campos que solo cambia un SUPER_ADMIN: si cambian, la web deja de leer su contenido o el mapa/reseñas se rompen. */
const SOLO_ADMIN: (keyof Farmacia)[] = ['slug', 'mapaUrl', 'googleLocationName'];

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
  const user = await requireUser();
  if (typeof id !== 'string') return { ok: false, error: 'Farmacia inválida' };
  const parsed = parseFarmaciaPatch(patch);
  if (!parsed.ok) return parsed;
  // Los idiomas solo cambian con sus acciones explícitas (idiomasActions.ts).
  if (parsed.data.idiomasActivos !== undefined) {
    return { ok: false, error: 'Los idiomas se gestionan desde «Idiomas de la web».' };
  }
  if (user.rol !== 'admin' && SOLO_ADMIN.some((k) => parsed.data[k] !== undefined)) {
    return { ok: false, error: 'Solo un administrador puede cambiar el identificador, el mapa o la conexión con Google.' };
  }
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
