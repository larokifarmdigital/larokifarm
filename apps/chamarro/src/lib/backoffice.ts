/**
 * Fuente de contenido: API pública del backoffice (Neon + R2).
 *
 * Activa con `CONTENT_SOURCE=backoffice` (ver `lib/sanity.ts`). El backoffice
 * devuelve el MISMO formato que la proyección GROQ de Sanity, así que los
 * componentes no cambian. Contrato:
 * apps/backoffice/src/core/farmacias/application/publicContent.ts
 *
 * Se lee en build (SSG): el backoffice tiene que estar levantado
 * (`pnpm --filter backoffice dev` → http://localhost:3001 en local).
 */
import type { Farmacia, ResenaGoogle, ResumenResenas } from './sanity';

const BACKOFFICE_URL = (import.meta.env.BACKOFFICE_URL?.trim() || 'http://localhost:3001').replace(/\/$/, '');

async function getJson<T>(path: string): Promise<T | null> {
  const res = await fetch(`${BACKOFFICE_URL}${path}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`[backoffice] ${res.status} en ${path}`);
  return (await res.json()) as T;
}

export async function obtenerFarmaciaBackoffice(slug: string): Promise<Farmacia | null> {
  try {
    return await getJson<Farmacia>(`/api/public/farmacias/${encodeURIComponent(slug)}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[backoffice] no se pudo cargar la farmacia "${slug}": ${msg}`);
    return null;
  }
}

// Una sola petición por build: home, /resenas y demás páginas comparten lista.
const cacheResenas = new Map<string, Promise<ResenaGoogle[]>>();

/** Reseñas visibles (no ocultas ni eliminadas), más recientes primero. */
export function listarResenasBackoffice(slug: string): Promise<ResenaGoogle[]> {
  let p = cacheResenas.get(slug);
  if (!p) {
    p = getJson<ResenaGoogle[]>(`/api/public/farmacias/${encodeURIComponent(slug)}/resenas`)
      .then((r) => r ?? [])
      .catch((error) => {
        const msg = error instanceof Error ? error.message : String(error);
        console.warn(`[backoffice] no se pudieron listar reseñas de "${slug}": ${msg}`);
        return [];
      });
    cacheResenas.set(slug, p);
  }
  return p;
}

/** Mismo cálculo que la query GROQ de `obtenerResenasGoogle`, en memoria. */
export async function obtenerResenasBackoffice(
  slug: string,
  limite: number,
  minRating: number,
  soloConComentario: boolean,
): Promise<ResumenResenas> {
  const visibles = (await listarResenasBackoffice(slug)).filter(
    (r) => r.rating >= minRating && (!soloConComentario || Boolean(r.comentario?.trim())),
  );
  const total = visibles.length;
  return {
    total,
    media: total ? visibles.reduce((s, r) => s + r.rating, 0) / total : 0,
    destacadas: visibles.filter((r) => r.destacada),
    recientes: visibles.filter((r) => !r.destacada).slice(0, limite),
  };
}
