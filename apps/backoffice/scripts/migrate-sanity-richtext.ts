/**
 * Completa los campos de texto enriquecido que la migración Fase D no copió
 * (`fromI18nArray` solo aceptaba strings y Sanity los guarda como Portable
 * Text): descripcionLarga, avisoLegal, politicaPrivacidad.
 *
 * Convierte Portable Text → HTML (mismo formato que guarda el TiptapField del
 * editor) con `portableTextAHtml` de packages/sanity-client — el mismo render
 * que usaban las landings, así el resultado visual no cambia.
 *
 * Solo rellena idiomas VACÍOS en Neon: nunca pisa lo editado en el backoffice.
 *
 * Uso (desde apps/backoffice):
 *   pnpm migrate:richtext           # dry-run
 *   pnpm migrate:richtext --write
 */

import { PrismaClient, type Prisma } from '@prisma/client';
import { portableTextAHtml } from '../../../packages/sanity-client/src/portable-text';
import type { PortableBlock } from '../../../packages/sanity-client/src/types';

const SANITY_PROJECT_ID = process.env.SANITY_PROJECT_ID ?? 'yovi040n';
const SANITY_DATASET = process.env.SANITY_DATASET ?? 'calendario';
const DRY_RUN = !process.argv.includes('--write');
const FIELDS = ['descripcionLarga', 'avisoLegal', 'politicaPrivacidad'] as const;
type Field = (typeof FIELDS)[number];

const prisma = new PrismaClient();

type I18nPT = { language: string; value?: PortableBlock[] }[] | null;
type SanityDoc = { slug: string } & Record<Field, I18nPT>;

async function main() {
  console.log(`[richtext] ${DRY_RUN ? 'DRY-RUN' : 'WRITE'}`);
  const q = `*[_type == "farmacia"]{ "slug": slug.current, ${FIELDS.join(', ')} }`;
  const res = await fetch(
    `https://${SANITY_PROJECT_ID}.api.sanity.io/v2024-10-01/data/query/${SANITY_DATASET}?query=${encodeURIComponent(q)}`,
  );
  if (!res.ok) throw new Error(`Sanity ${res.status}`);
  const docs = ((await res.json()) as { result: SanityDoc[] }).result;

  for (const doc of docs) {
    const b = await prisma.business.findUnique({ where: { slug: doc.slug } });
    if (!b) continue;
    const data: Partial<Record<Field, Prisma.InputJsonValue>> = {};

    for (const field of FIELDS) {
      const current = (b[field] ?? {}) as Record<string, string>;
      const next = { ...current };
      const filled: string[] = [];
      for (const entry of doc[field] ?? []) {
        if (current[entry.language]?.replace(/<p><\/p>/g, '').trim()) continue; // ya editado
        const html = portableTextAHtml(entry.value);
        if (!html) continue;
        next[entry.language] = html;
        filled.push(entry.language);
      }
      if (filled.length) {
        data[field] = next;
        console.log(`  · ${doc.slug} ${field}: ${filled.join(', ')}`);
      }
    }

    if (!DRY_RUN && Object.keys(data).length) {
      await prisma.business.update({ where: { id: b.id }, data });
    }
  }
  console.log('[richtext] hecho');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
