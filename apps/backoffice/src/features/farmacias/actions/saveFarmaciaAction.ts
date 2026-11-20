'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/core/auth';
import { getFarmaciaRepository, parseFarmaciaPatch, type Farmacia } from '@/core/farmacias';
import { LOCALES, type Locale, type SaveResult } from '@/core/shared';

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
  // Los idiomas solo se activan con su acción explícita (activarIdiomaAction).
  if (parsed.data.idiomasActivos !== undefined) {
    return { ok: false, error: 'Los idiomas se activan desde el aviso de idioma del editor.' };
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

/**
 * Activa un idioma en la web (acción explícita, con confirmación en la UI).
 * Al pulsar una pestaña de idioma ya NO se activa nada.
 */
export async function activarIdiomaAction(id: string, locale: string): Promise<SaveResult<Farmacia>> {
  await requireUser();
  if (typeof id !== 'string' || !(LOCALES as readonly string[]).includes(locale)) {
    return { ok: false, error: 'Idioma no válido' };
  }
  const repo = getFarmaciaRepository();
  const current = await repo.getFarmacia(id);
  if (!current) return { ok: false, error: 'Farmacia no encontrada' };
  if (current.idiomasActivos.includes(locale as Locale)) return { ok: true, data: current };
  const idiomasActivos = LOCALES.filter((l) => l === locale || current.idiomasActivos.includes(l));
  // Control optimista: dos activaciones a la vez no se pisan.
  const res = await repo.saveFarmacia(id, { idiomasActivos }, { expectedUpdatedAt: current.updatedAt });
  if (res.ok) {
    revalidatePath('/farmacias');
    revalidatePath(`/farmacias/${id}`);
  }
  return res;
}
