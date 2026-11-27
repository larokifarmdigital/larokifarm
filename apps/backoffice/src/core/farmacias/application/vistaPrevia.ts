import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Farmacia } from '../domain/models/Farmacia';
import type { FarmaciaRepository } from '../domain/repositories/FarmaciaRepository';

/**
 * Vista previa de la landing con lo guardado y sin publicar.
 *
 * El editor pide un enlace firmado (`firmarVistaPrevia`) y lo pasa a la página
 * `/vista-previa` de la landing, que lo reenvía tal cual a
 * `/api/vista-previa/farmacias/:slug`. Solo el backoffice conoce la clave: la
 * landing no guarda ningún secreto. El enlace caduca y vale para una sola
 * farmacia.
 *
 * Clave: `AUTH_SECRET` (ya existe en todos los entornos) con un prefijo propio,
 * para que una firma de vista previa no sirva para nada más.
 */

const DURACION_SEGUNDOS = 2 * 60 * 60;
const CONTEXTO = 'larokifarm:vista-previa:v1';

function clave(): string {
  const secreto = process.env.AUTH_SECRET?.trim();
  if (!secreto) throw new Error('[vista-previa] falta AUTH_SECRET');
  return secreto;
}

function firma(datos: string): Buffer {
  return createHmac('sha256', clave()).update(`${CONTEXTO}\n${datos}`).digest();
}

/** Enlace firmado `<caducidad>.<firma>` para la farmacia `slug`. */
export function firmarVistaPrevia(slug: string, ahora = Date.now()): string {
  const caduca = Math.floor(ahora / 1000) + DURACION_SEGUNDOS;
  return `${caduca}.${firma(`${slug}\n${caduca}`).toString('base64url')}`;
}

/** true si el enlace es de esa farmacia, está bien firmado y no ha caducado. */
export function verificarVistaPrevia(token: string | null | undefined, slug: string, ahora = Date.now()): boolean {
  const m = /^(\d{1,12})\.([A-Za-z0-9_-]{43})$/.exec(token ?? '');
  if (!m) return false;
  const caduca = Number(m[1]);
  if (caduca * 1000 < ahora) return false;
  const esperada = firma(`${slug}\n${caduca}`);
  const recibida = Buffer.from(m[2], 'base64url');
  return recibida.length === esperada.length && timingSafeEqual(recibida, esperada);
}

/** Cualquier estado (borrador, publicada o archivada): la vista previa es para editar. */
export class GetFarmaciaVistaPreviaUseCase {
  constructor(private readonly repo: FarmaciaRepository) {}

  async execute(
    slug: string,
    token: string | null,
  ): Promise<{ ok: true; farmacia: Farmacia } | { ok: false; reason: 'enlace-no-valido' | 'not-found' }> {
    if (!verificarVistaPrevia(token, slug)) return { ok: false, reason: 'enlace-no-valido' };
    const farmacia = await this.repo.getFarmaciaBySlugSinSesion(slug);
    return farmacia ? { ok: true, farmacia } : { ok: false, reason: 'not-found' };
  }
}
