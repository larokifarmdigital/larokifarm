'use server';

import { requireUser } from '@/core/auth';
import { firmarVistaPrevia, getFarmaciaRepository } from '@/core/farmacias';
import { esLocale, LOCALE_PRINCIPAL } from '@/core/shared';
import { landingUrl } from '@/shared/lib/landingUrl';
import { esPaginaVistaPrevia, tieneVistaPrevia } from '@/features/farmacias/ui/lib/vistaPrevia';

export type EnlaceVistaPrevia = { ok: true; url: string; origen: string } | { ok: false; error: string };

/**
 * Enlace firmado a la vista previa de la landing (lo guardado, sin publicar).
 * Cualquier usuario con acceso a la farmacia (también el de solo consulta):
 * `getFarmacia` filtra por negocio. En local, `VISTA_PREVIA_URL_<SLUG>` apunta
 * a la landing en marcha (p. ej. http://localhost:4321); si no, su «Web».
 */
export async function enlaceVistaPreviaAction(
  id: string,
  opciones: { lang: string; seccion: string; etiqueta: string; pagina?: string },
): Promise<EnlaceVistaPrevia> {
  await requireUser();
  let farmacia;
  try {
    farmacia = await getFarmaciaRepository().getFarmacia(id);
  } catch {
    return { ok: false, error: 'No tienes acceso a esta farmacia.' };
  }
  if (!farmacia) return { ok: false, error: 'Farmacia no encontrada.' };
  if (!tieneVistaPrevia(farmacia.slug)) return { ok: false, error: 'Esta web todavía no tiene vista previa.' };

  const local = process.env[`VISTA_PREVIA_URL_${farmacia.slug.toUpperCase().replace(/-/g, '_')}`]?.trim();
  const base = landingUrl(local || farmacia.web);
  if (!base) return { ok: false, error: 'Añade la dirección de tu web en «Contacto y dirección».' };

  const url = new URL('/vista-previa', base);
  url.searchParams.set('t', firmarVistaPrevia(farmacia.slug));
  url.searchParams.set('lang', esLocale(opciones.lang) ? opciones.lang : LOCALE_PRINCIPAL);
  url.searchParams.set('seccion', opciones.seccion.slice(0, 40));
  url.searchParams.set('etiqueta', opciones.etiqueta.slice(0, 80));
  if (esPaginaVistaPrevia(opciones.pagina)) url.searchParams.set('pagina', opciones.pagina);
  return { ok: true, url: url.toString(), origen: url.origin };
}
