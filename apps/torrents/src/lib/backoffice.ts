/**
 * Fuente de contenido: API pública del backoffice (Neon + R2).
 *
 * Única fuente de contenido de la web (Sanity se retiró el 24-11-2026). El
 * backoffice devuelve el mismo formato que usaba Sanity, así que los
 * componentes no cambian. Contrato:
 * apps/backoffice/src/core/farmacias/application/publicContent.ts
 *
 * Se lee en build (SSG): el backoffice tiene que estar levantado
 * (`pnpm --filter backoffice dev` → http://localhost:3001 en local).
 */
import type { Farmacia, ResenaGoogle, ResumenResenas } from './contenido';

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
const cacheResenas = new Map<string, Promise<(ResenaGoogle & { enWeb?: boolean })[]>>();

function todasLasResenas(slug: string) {
  let p = cacheResenas.get(slug);
  if (!p) {
    p = getJson<(ResenaGoogle & { enWeb?: boolean })[]>(`/api/public/farmacias/${encodeURIComponent(slug)}/resenas`).then((r) => r ?? []);
    cacheResenas.set(slug, p);
  }
  return p;
}

/**
 * Reseñas que se pintan en la web: las que cumplen las reglas del editor
 * (switch por reseña, mínimo de estrellas, solo con comentario). Más
 * recientes primero.
 */
export async function listarResenasBackoffice(slug: string): Promise<ResenaGoogle[]> {
  return (await todasLasResenas(slug)).filter((r) => r.enWeb !== false);
}

/**
 * Resumen para la landing. Las reglas las decide el editor en el backoffice,
 * así que `minRating` / `soloConComentario` (fijos en el código de la
 * landing) se ignoran en este modo. Media y total cuentan TODAS las reseñas
 * no ocultas (los datos reales de Google), no solo las que se pintan.
 */
export async function obtenerResenasBackoffice(
  slug: string,
  limite: number,
  _minRating?: number,
  _soloConComentario?: boolean,
): Promise<ResumenResenas> {
  void _minRating;
  void _soloConComentario;
  const todas = await todasLasResenas(slug);
  const enWeb = todas.filter((r) => r.enWeb !== false);
  const total = todas.length;
  return {
    total,
    media: total ? todas.reduce((s, r) => s + r.rating, 0) / total : 0,
    destacadas: enWeb.filter((r) => r.destacada),
    recientes: enWeb.filter((r) => !r.destacada).slice(0, limite),
  };
}
