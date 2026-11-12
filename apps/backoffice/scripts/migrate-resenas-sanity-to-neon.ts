/**
 * Migración de reseñas Google: Sanity (`resenaGoogle`) → Neon (`content_resenas`).
 *
 * - Upsert por (businessId, googleReviewId): re-ejecutable sin duplicar.
 * - La foto del autor se descarga del CDN de Sanity y se re-aloja en el
 *   storage (R2) → la landing la sirve desde el backoffice, sin depender de
 *   Sanity ni de Google ("cero cookies" de Torrents).
 *
 * Uso (desde apps/backoffice):
 *   pnpm migrate:resenas                 # dry-run
 *   pnpm migrate:resenas --write         # escritura real
 *   pnpm migrate:resenas --write --slug torrents
 *
 * Env (.env.local): DATABASE_URL, STORAGE_DRIVER + R2_*,
 *   SANITY_PROJECT_ID (default yovi040n), SANITY_DATASET (default calendario,
 *   el que leen las landings).
 */

import { PrismaClient } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';
import { getStorage } from '../src/core/storage/infrastructure';

const SANITY_PROJECT_ID = process.env.SANITY_PROJECT_ID ?? 'yovi040n';
const SANITY_DATASET = process.env.SANITY_DATASET ?? 'calendario';
const DRY_RUN = !process.argv.includes('--write');
const TARGET_SLUG = (() => {
  const i = process.argv.indexOf('--slug');
  return i >= 0 ? process.argv[i + 1] : null;
})();

const prisma = new PrismaClient();

type SanityResena = {
  _id: string;
  slug: string | null;
  googleReviewId: string;
  autorNombre?: string;
  autorFoto?: { url: string; mimeType?: string; extension?: string } | null;
  rating: number;
  comentario?: string;
  comentarioIdioma?: string;
  respuestaOwner?: string;
  respuestaOwnerFecha?: string;
  fechaPublicacion: string;
  destacada?: boolean;
  oculta?: boolean;
  eliminadaEnGoogle?: boolean;
};

const GROQ = `*[_type == "resenaGoogle" ${TARGET_SLUG ? '&& farmacia->slug.current == $slug' : ''}]{
  _id,
  "slug": farmacia->slug.current,
  googleReviewId,
  autorNombre,
  "autorFoto": autorFoto.asset->{ url, mimeType, extension },
  rating, comentario, comentarioIdioma, respuestaOwner, respuestaOwnerFecha,
  fechaPublicacion, destacada, oculta, eliminadaEnGoogle
}`;

async function sanityFetch<T>(query: string, params: Record<string, string> = {}): Promise<T> {
  const qs = new URLSearchParams({ query });
  for (const [k, v] of Object.entries(params)) qs.set(`$${k}`, JSON.stringify(v));
  const url = `https://${SANITY_PROJECT_ID}.api.sanity.io/v2024-10-01/data/query/${SANITY_DATASET}?${qs}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sanity ${res.status}: ${await res.text()}`);
  return ((await res.json()) as { result: T }).result;
}

async function main() {
  console.log(`[resenas] dataset=${SANITY_DATASET} ${DRY_RUN ? 'DRY-RUN' : 'WRITE'}${TARGET_SLUG ? ` slug=${TARGET_SLUG}` : ''}`);
  const resenas = await sanityFetch<SanityResena[]>(GROQ, TARGET_SLUG ? { slug: TARGET_SLUG } : {});
  const businesses = await prisma.business.findMany({ select: { id: true, slug: true } });
  const bySlug = new Map(businesses.map((b) => [b.slug, b.id]));
  const storage = DRY_RUN ? null : getStorage();

  let ok = 0;
  let skipped = 0;
  let avatars = 0;
  for (const r of resenas) {
    const businessId = r.slug ? bySlug.get(r.slug) : undefined;
    if (!businessId || !r.googleReviewId) {
      skipped++;
      console.warn(`  · skip ${r._id}: farmacia "${r.slug}" no existe en Neon o sin googleReviewId`);
      continue;
    }

    const existing = await prisma.resena.findUnique({
      where: { businessId_googleReviewId: { businessId, googleReviewId: r.googleReviewId } },
      select: { id: true, avatarStorageKey: true },
    });
    const id = existing?.id ?? createId();

    // Foto: solo se sube si aún no está re-alojada.
    let avatarStorageKey = existing?.avatarStorageKey ?? null;
    if (!avatarStorageKey && r.autorFoto?.url) {
      const ext = r.autorFoto.extension ?? 'jpg';
      avatarStorageKey = `${r.slug}/resenas/avatars/${r.googleReviewId.replace(/[^\w-]/g, '_')}.${ext}`;
      if (storage) {
        const res = await fetch(r.autorFoto.url);
        if (!res.ok) throw new Error(`descarga avatar ${r._id}: ${res.status}`);
        const bytes = Buffer.from(await res.arrayBuffer());
        await storage.upload(avatarStorageKey, bytes, r.autorFoto.mimeType ?? 'image/jpeg');
      }
      avatars++;
    }

    const data = {
      autor: r.autorNombre?.trim() || 'Anónimo',
      avatarStorageKey,
      avatarUrl: avatarStorageKey ? `/api/public/resenas/${id}/avatar` : null,
      puntuacion: Math.round(r.rating),
      texto: r.comentario?.trim() || null,
      textoIdioma: r.comentarioIdioma ?? null,
      respuesta: r.respuestaOwner?.trim() || null,
      respuestaFecha: r.respuestaOwnerFecha ? new Date(r.respuestaOwnerFecha) : null,
      fecha: new Date(r.fechaPublicacion),
      fuente: 'google',
      destacada: Boolean(r.destacada),
      oculta: Boolean(r.oculta),
      eliminadaEnGoogle: Boolean(r.eliminadaEnGoogle),
    };

    if (!DRY_RUN) {
      await prisma.resena.upsert({
        where: { businessId_googleReviewId: { businessId, googleReviewId: r.googleReviewId } },
        create: { id, businessId, googleReviewId: r.googleReviewId, ...data },
        update: data,
      });
    }
    ok++;
  }

  console.log(`[resenas] ${ok} reseñas ${DRY_RUN ? 'a migrar' : 'migradas'}, ${avatars} fotos ${DRY_RUN ? 'a subir' : 'subidas'}, ${skipped} omitidas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
