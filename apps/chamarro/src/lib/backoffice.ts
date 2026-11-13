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

/**
 * Un fallo (red, 5xx) ROMPE el build a propósito: así el hosting mantiene la
 * versión anterior en vez de publicar la web vacía. 404 = farmacia no
 * publicada → null. Reintenta por si la función del backoffice está fría.
 */
async function getJson<T>(path: string, intentos = 3): Promise<T | null> {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(`${BACKOFFICE_URL}${path}`, { signal: AbortSignal.timeout(20_000) });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as T;
    } catch (error) {
      if (i >= intentos) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`[backoffice] ${BACKOFFICE_URL}${path}: ${msg}`);
      }
      await new Promise((r) => setTimeout(r, 1000 * i));
    }
  }
}

/**
 * Esta landing es de UNA farmacia: si la API responde 404 (pasada a
 * borrador, archivada o con el slug cambiado) el build falla en vez de
 * publicar la web vacía. El hosting conserva el deploy anterior.
 */
export async function obtenerFarmaciaBackoffice(slug: string): Promise<Farmacia | null> {
  const f = await getJson<Farmacia>(`/api/public/farmacias/${encodeURIComponent(slug)}`);
  if (!f) {
    throw new Error(
      `[backoffice] la farmacia "${slug}" no está publicada en ${BACKOFFICE_URL} (¿borrador, archivada o slug cambiado?). Build abortado para no publicar la web vacía.`,
    );
  }
  return f;
}

// Una sola petición por build: home, /resenas y demás páginas comparten lista.
const cacheResenas = new Map<string, Promise<ResenaGoogle[]>>();

/** Reseñas visibles (no ocultas ni eliminadas), más recientes primero. */
export function listarResenasBackoffice(slug: string): Promise<ResenaGoogle[]> {
  let p = cacheResenas.get(slug);
  if (!p) {
    p = getJson<ResenaGoogle[]>(`/api/public/farmacias/${encodeURIComponent(slug)}/resenas`).then((r) => r ?? []);
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
