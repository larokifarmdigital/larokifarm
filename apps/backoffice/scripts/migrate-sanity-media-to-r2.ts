/**
 * Re-aloja en R2 las imágenes que aún apuntan al CDN de Sanity, para poder
 * dejar de usar Sanity sin romper las landings.
 *
 * - content_images con storageKey `sanity:<url>` (hero/sobre migrados en
 *   Fase D): se descargan, se suben a R2 y se actualizan storageKey +
 *   publicUrl (`/api/content-images/<id>`). Mismo id → nada más cambia.
 * - Business.logoUrl en cdn.sanity.io → ContentImage(role='logo').
 * - seo.imagenOg de Sanity → ContentImage(role='og') si la farmacia no tiene.
 *
 * Re-ejecutable: solo toca lo que siga en Sanity.
 *
 * Uso (desde apps/backoffice):
 *   pnpm migrate:media            # dry-run
 *   pnpm migrate:media --write
 */

import { PrismaClient } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';
import { getStorage } from '../src/core/storage/infrastructure';
import { buildContentImageKey, type ContentImageRole } from '../src/core/farmacias/domain/contentImageKey';

const SANITY_PROJECT_ID = process.env.SANITY_PROJECT_ID ?? 'yovi040n';
const SANITY_DATASET = process.env.SANITY_DATASET ?? 'calendario';
const DRY_RUN = !process.argv.includes('--write');
const SANITY_CDN = 'cdn.sanity.io';

const prisma = new PrismaClient();

async function sanityFetch<T>(query: string): Promise<T> {
  const url = `https://${SANITY_PROJECT_ID}.api.sanity.io/v2024-10-01/data/query/${SANITY_DATASET}?query=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sanity ${res.status}: ${await res.text()}`);
  return ((await res.json()) as { result: T }).result;
}

async function download(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`descarga ${url}: ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') ?? 'image/jpeg';
  const filename = new URL(url).pathname.split('/').pop() ?? 'image';
  return { bytes, contentType, filename };
}

async function uploadNew(slug: string, role: ContentImageRole, url: string, id: string) {
  const { bytes, contentType, filename } = await download(url);
  const storageKey = buildContentImageKey({ businessSlug: slug, role, cuid: id, filename });
  await getStorage().upload(storageKey, bytes, contentType);
  return { storageKey, sizeBytes: bytes.length };
}

async function main() {
  console.log(`[media] ${DRY_RUN ? 'DRY-RUN' : 'WRITE'}`);
  const businesses = await prisma.business.findMany({
    select: { id: true, slug: true, logoUrl: true, imagenes: { select: { id: true, role: true, storageKey: true, publicUrl: true } } },
  });

  // 1) content_images aún en Sanity
  for (const b of businesses) {
    for (const img of b.imagenes.filter((i) => i.storageKey.startsWith('sanity:'))) {
      const url = img.storageKey.slice('sanity:'.length);
      console.log(`  · ${b.slug} ${img.role} ${img.id}`);
      if (DRY_RUN) continue;
      const { storageKey, sizeBytes } = await uploadNew(b.slug, img.role as ContentImageRole, url, img.id);
      await prisma.contentImage.update({
        where: { id: img.id },
        data: { storageKey, sizeBytes, publicUrl: `/api/content-images/${img.id}` },
      });
    }
  }

  // 2) logo legacy + 3) OG desde Sanity
  const ogBySlug = new Map(
    (
      await sanityFetch<{ slug: string; og: string | null }[]>(
        `*[_type == "farmacia"]{ "slug": slug.current, "og": seo.imagenOg.asset->url }`,
      )
    ).map((f) => [f.slug, f.og]),
  );

  for (const b of businesses) {
    const tieneRol = (role: string) => b.imagenes.some((i) => i.role === role);
    const pendientes: { role: ContentImageRole; url: string }[] = [];
    if (b.logoUrl?.includes(SANITY_CDN) && !tieneRol('logo')) pendientes.push({ role: 'logo', url: b.logoUrl });
    const og = ogBySlug.get(b.slug);
    if (og && !tieneRol('og')) pendientes.push({ role: 'og', url: og });

    for (const p of pendientes) {
      console.log(`  · ${b.slug} ${p.role} (nuevo)`);
      if (DRY_RUN) continue;
      const id = createId();
      const { storageKey, sizeBytes } = await uploadNew(b.slug, p.role, p.url, id);
      await prisma.contentImage.create({
        data: { id, businessId: b.id, role: p.role, storageKey, sizeBytes, publicUrl: `/api/content-images/${id}`, alt: {}, orden: 0 },
      });
      if (p.role === 'logo') await prisma.business.update({ where: { id: b.id }, data: { logoUrl: null } });
    }
  }
  console.log('[media] hecho');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
