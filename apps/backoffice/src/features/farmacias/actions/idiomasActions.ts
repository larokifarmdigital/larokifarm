'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/core/auth';
import {
  getContentImageRepository,
  getFarmaciaRepository,
  imagenesConAltEn,
  patchSinIdioma,
  UpdateContentImageAltUseCase,
  type Farmacia,
} from '@/core/farmacias';
import { esLocale, LOCALES, LOCALE_PRINCIPAL, type Locale, type SaveResult } from '@/core/shared';

/**
 * Gestión de idiomas de una farmacia ("Idiomas de la web"). Pueden usarla el
 * SUPER_ADMIN y el responsable de esa farmacia; la cuenta de solo consulta no.
 * El tenant y el permiso de escritura los vuelve a comprobar el repositorio
 * (`getFarmacia` filtra por negocio y `saveFarmacia` exige poder editar).
 * Todas usan control optimista con el `updatedAt` leído.
 */

type Contexto = { ok: true; farmacia: Farmacia; locale: Locale } | { ok: false; error: string };

async function preparar(id: unknown, locale: unknown): Promise<Contexto> {
  const user = await requireUser();
  if (user.rol === 'viewer') return { ok: false, error: 'Tu cuenta es de solo consulta: no puede cambiar los idiomas.' };
  if (typeof id !== 'string' || !esLocale(locale)) return { ok: false, error: 'Idioma no válido' };
  try {
    const farmacia = await getFarmaciaRepository().getFarmacia(id);
    if (!farmacia) return { ok: false, error: 'Farmacia no encontrada' };
    return { ok: true, farmacia, locale };
  } catch {
    // tenantFilter lanza si la sesión no tiene negocio: respuesta limpia, sin 500
    return { ok: false, error: 'No tienes acceso a esta farmacia.' };
  }
}

function revalidar(id: string) {
  revalidatePath('/farmacias');
  revalidatePath(`/farmacias/${id}`);
}

export async function activarIdiomaAction(id: string, locale: string): Promise<SaveResult<Farmacia>> {
  const ctx = await preparar(id, locale);
  if (!ctx.ok) return ctx;
  const { farmacia: f, locale: l } = ctx;
  if (f.idiomasActivos.includes(l)) return { ok: true, data: f };
  const idiomasActivos = LOCALES.filter((x) => x === l || x === LOCALE_PRINCIPAL || f.idiomasActivos.includes(x));
  const res = await getFarmaciaRepository().saveFarmacia(f.id, { idiomasActivos }, { expectedUpdatedAt: f.updatedAt });
  if (res.ok) revalidar(f.id);
  return res;
}

export async function desactivarIdiomaAction(id: string, locale: string): Promise<SaveResult<Farmacia>> {
  const ctx = await preparar(id, locale);
  if (!ctx.ok) return ctx;
  const { farmacia: f, locale: l } = ctx;
  if (l === LOCALE_PRINCIPAL) return { ok: false, error: 'El castellano es el idioma principal y no se puede desactivar.' };
  if (!f.idiomasActivos.includes(l)) return { ok: true, data: f };
  const idiomasActivos = LOCALES.filter((x) => x !== l && (x === LOCALE_PRINCIPAL || f.idiomasActivos.includes(x)));
  const res = await getFarmaciaRepository().saveFarmacia(f.id, { idiomasActivos }, { expectedUpdatedAt: f.updatedAt });
  if (res.ok) revalidar(f.id);
  return res;
}

/**
 * Borra para siempre los textos de un idioma DESACTIVADO (todos los campos y
 * las descripciones de las fotos). No se puede hacer con un idioma activo.
 */
export async function eliminarTraduccionesAction(id: string, locale: string): Promise<SaveResult<Farmacia>> {
  const ctx = await preparar(id, locale);
  if (!ctx.ok) return ctx;
  const { farmacia: f, locale: l } = ctx;
  if (l === LOCALE_PRINCIPAL) return { ok: false, error: 'Los textos en castellano no se pueden eliminar.' };
  if (f.idiomasActivos.includes(l)) return { ok: false, error: 'Desactiva el idioma antes de eliminar sus textos.' };

  const repo = getFarmaciaRepository();
  const patch = patchSinIdioma(f, l);
  let res: SaveResult<Farmacia> = { ok: true, data: f };
  if (Object.keys(patch).length > 0) {
    res = await repo.saveFarmacia(f.id, patch, { expectedUpdatedAt: f.updatedAt });
    if (!res.ok) return res;
  }

  const altUseCase = new UpdateContentImageAltUseCase(getContentImageRepository());
  for (const img of imagenesConAltEn(f, l)) {
    const { [l]: _fuera, ...alt } = img.alt;
    void _fuera;
    const r = await altUseCase.execute(f.id, img.id, alt);
    if (!r.ok) return { ok: false, error: 'Se borraron los textos, pero no las descripciones de algunas fotos. Vuelve a intentarlo.' };
  }

  revalidar(f.id);
  // Tras tocar fotos, la versión fresca la da una lectura nueva
  const fresca = await repo.getFarmacia(f.id);
  return fresca ? { ok: true, data: fresca } : res;
}
