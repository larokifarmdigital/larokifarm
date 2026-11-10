/**
 * Fase D — Migración de contenido de Farmacias: Sanity → Neon.
 *
 * Lee todas las farmacias del dataset Sanity y las hace `upsert` por `slug`
 * en Neon via Prisma. Reemplaza children (servicios/features/faqs) con
 * replace-all (misma estrategia que el repo del backoffice). Las imágenes
 * se guardan con su URL del CDN de Sanity directamente — no se mueven a R2
 * en esta fase (eso es Fase C).
 *
 * Uso:
 *   # Dry-run (por defecto): muestra qué haría sin escribir nada.
 *   pnpm dlx tsx scripts/migrate-sanity-to-neon.ts
 *
 *   # Escritura real:
 *   pnpm dlx tsx scripts/migrate-sanity-to-neon.ts --write
 *
 *   # Una farmacia concreta por slug:
 *   pnpm dlx tsx scripts/migrate-sanity-to-neon.ts --write --slug torrents
 *
 * Config vía env (.env.local):
 *   SANITY_PROJECT_ID    (default: yovi040n)
 *   SANITY_DATASET       (default: cima)
 *   SANITY_READ_TOKEN    (opcional, solo si el dataset es privado)
 *   DATABASE_URL         (ya existe para Prisma)
 */

import { PrismaClient, Prisma } from '@prisma/client';

const SANITY_PROJECT_ID = process.env.SANITY_PROJECT_ID ?? 'yovi040n';
const SANITY_DATASET = process.env.SANITY_DATASET ?? 'cima';
const SANITY_API_VERSION = '2024-10-01';
const SANITY_TOKEN = process.env.SANITY_READ_TOKEN;

const DRY_RUN = !process.argv.includes('--write');
const TARGET_SLUG = (() => {
  const i = process.argv.indexOf('--slug');
  return i >= 0 ? process.argv[i + 1] : null;
})();

const prisma = new PrismaClient();

// ──────────────────────────────────────────────────────────────────
// Sanity HTTP client (sin @sanity/client)
// ──────────────────────────────────────────────────────────────────

async function sanityFetch<T>(groq: string): Promise<T> {
  const url = `https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}?query=${encodeURIComponent(groq)}`;
  const headers: Record<string, string> = {};
  if (SANITY_TOKEN) headers.Authorization = `Bearer ${SANITY_TOKEN}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Sanity ${res.status}: ${txt}`);
  }
  const json = (await res.json()) as { result: T };
  return json.result;
}

// ──────────────────────────────────────────────────────────────────
// Helpers de deserialización Sanity → formato interno
// ──────────────────────────────────────────────────────────────────

const LOCALES = ['es', 'en', 'ca'] as const;
type Locale = (typeof LOCALES)[number];
type MultilangText = Partial<Record<Locale, string>>;

/** El plugin internationalized-array guarda arrays `[{_key:'es', value:'...'}]`. */
function fromI18nArray(v: unknown): MultilangText {
  if (!Array.isArray(v)) return {};
  const out: MultilangText = {};
  for (const el of v) {
    if (!el || typeof el !== 'object') continue;
    const o = el as { _key?: string; value?: string };
    if (o._key && typeof o.value === 'string' && (LOCALES as readonly string[]).includes(o._key)) {
      out[o._key as Locale] = o.value;
    }
  }
  return out;
}

/** Convierte una referencia de imagen Sanity (asset._ref) en URL pública del CDN. */
function sanityImageUrl(ref: string | undefined | null): string | null {
  if (!ref || typeof ref !== 'string') return null;
  // ref shape: image-<hash>-<WxH>-<ext>
  const m = ref.match(/^image-([a-f0-9]+)-(\d+x\d+)-(\w+)$/);
  if (!m) return null;
  const [, hash, dims, ext] = m;
  return `https://cdn.sanity.io/images/${SANITY_PROJECT_ID}/${SANITY_DATASET}/${hash}-${dims}.${ext}`;
}

function imageAssetToUrl(img: unknown): { url: string; alt?: MultilangText } | null {
  if (!img || typeof img !== 'object') return null;
  const o = img as { asset?: { _ref?: string }; alt?: unknown };
  const url = sanityImageUrl(o.asset?._ref);
  if (!url) return null;
  return { url, alt: o.alt ? fromI18nArray(o.alt) : undefined };
}

// ──────────────────────────────────────────────────────────────────
// GROQ query — todos los campos de farmacia
// ──────────────────────────────────────────────────────────────────

const FARMACIA_GROQ = `
*[_type=="farmacia" && !(_id in path("drafts.**"))]{
  _id, _createdAt, _updatedAt,
  nombre, "slug": slug.current,
  logo, titular, numeroColegiado,
  "idiomasActivos": idiomasActivos[]->codigo,
  heroChip, heroSubtitulo, descripcionCorta, descripcionLarga,
  imagenes, heroTarjetasFlotantes, featuresLista,
  sobreNosotros, imagenesSobre,
  textosServicios, servicios, textosFaqs, faqs,
  textosResenas, googleLocationName,
  googleMapsUrl, direccion, mapaUrl, contacto, horarios,
  redesSociales, avisoLegal, politicaPrivacidad,
  seo
}
`;

type SanityFarmacia = Record<string, unknown>;

// ──────────────────────────────────────────────────────────────────
// Mappers Sanity → Prisma inputs
// ──────────────────────────────────────────────────────────────────

function get<T = unknown>(o: Record<string, unknown>, k: string): T | undefined {
  const v = o[k];
  return v === undefined || v === null ? undefined : (v as T);
}

function mapFarmaciaToBusinessData(f: SanityFarmacia) {
  const contacto = (get<Record<string, unknown>>(f, 'contacto') ?? {}) as Record<string, unknown>;
  const direccion = (get<Record<string, unknown>>(f, 'direccion') ?? {}) as Record<string, unknown>;
  const logoImg = imageAssetToUrl(get(f, 'logo'));

  const horarios = ((get<Record<string, unknown>[]>(f, 'horarios') ?? []) as Record<string, unknown>[]).map((h) => ({
    dia: h.dia as string,
    tramos: h.cerrado
      ? []
      : [{ abre: (h.apertura as string) ?? '', cierra: (h.cierre as string) ?? '' }],
    cerrado: h.cerrado as boolean | undefined,
  }));

  return {
    name: (get<string>(f, 'nombre') ?? 'Sin nombre').trim(),
    slug: (get<string>(f, 'slug') ?? '').trim(),
    titular: get<string>(f, 'titular') ?? null,
    numeroColegiado: get<string>(f, 'numeroColegiado') ?? null,
    telefono: (get<string>(contacto, 'telefono') as string) ?? null,
    whatsapp: (get<string>(contacto, 'whatsapp') as string) ?? null,
    email: (get<string>(contacto, 'email') as string) ?? null,
    web: (get<string>(contacto, 'web') as string) ?? null,
    ciudad: (get<string>(direccion, 'ciudad') as string) ?? null,
    logoUrl: logoImg?.url ?? null,
    googleMapsUrl: get<string>(f, 'googleMapsUrl') ?? null,
    mapaUrl: get<string>(f, 'mapaUrl') ?? null,
    googleLocationName: get<string>(f, 'googleLocationName') ?? null,
    idiomasActivos: (get<string[]>(f, 'idiomasActivos') ?? ['es']) as Prisma.InputJsonValue,
    descripcionCorta: fromI18nArray(get(f, 'descripcionCorta')) as Prisma.InputJsonValue,
    descripcionLarga: fromI18nArray(get(f, 'descripcionLarga')) as Prisma.InputJsonValue,
    heroChip: fromI18nArray(get(f, 'heroChip')) as Prisma.InputJsonValue,
    heroSubtitulo: fromI18nArray(get(f, 'heroSubtitulo')) as Prisma.InputJsonValue,
    heroTarjetasFlotantes: ((get<Record<string, unknown>[]>(f, 'heroTarjetasFlotantes') ?? []) as Record<string, unknown>[]).map((t, i) => ({
      id: (t._key as string) ?? `float-${i}`,
      icono: t.icono ?? null,
      titulo: fromI18nArray(t.titulo),
      subtitulo: fromI18nArray(t.subtitulo),
      orden: i,
    })) as Prisma.InputJsonValue,
    sobreNosotros: ((): Prisma.InputJsonValue => {
      const s = get<Record<string, unknown>>(f, 'sobreNosotros');
      if (!s) return Prisma.JsonNull as unknown as Prisma.InputJsonValue;
      return {
        chip: fromI18nArray(s.chip),
        titulo: fromI18nArray(s.titulo),
        anyosExperiencia: typeof s.anyosExperiencia === 'number' ? s.anyosExperiencia : undefined,
        puntos: Array.isArray(s.puntos) ? (s.puntos as unknown[]).map(fromI18nArray) : [],
      } as Prisma.InputJsonValue;
    })(),
    avisoLegal: fromI18nArray(get(f, 'avisoLegal')) as Prisma.InputJsonValue,
    politicaPrivacidad: fromI18nArray(get(f, 'politicaPrivacidad')) as Prisma.InputJsonValue,
    textosServicios: ((): Prisma.InputJsonValue => {
      const t = get<Record<string, unknown>>(f, 'textosServicios');
      if (!t) return Prisma.JsonNull as unknown as Prisma.InputJsonValue;
      return {
        chip: fromI18nArray(t.chip),
        titulo: fromI18nArray(t.titulo),
        subtitulo: fromI18nArray(t.subtitulo),
      } as Prisma.InputJsonValue;
    })(),
    textosFaqs: ((): Prisma.InputJsonValue => {
      const t = get<Record<string, unknown>>(f, 'textosFaqs');
      if (!t) return Prisma.JsonNull as unknown as Prisma.InputJsonValue;
      return {
        chip: fromI18nArray(t.chip),
        titulo: fromI18nArray(t.titulo),
        subtitulo: fromI18nArray(t.subtitulo),
      } as Prisma.InputJsonValue;
    })(),
    textosResenas: ((): Prisma.InputJsonValue => {
      const t = get<Record<string, unknown>>(f, 'textosResenas');
      if (!t) return Prisma.JsonNull as unknown as Prisma.InputJsonValue;
      return {
        chip: fromI18nArray(t.chip),
        titulo: fromI18nArray(t.titulo),
        subtitulo: fromI18nArray(t.subtitulo),
      } as Prisma.InputJsonValue;
    })(),
    horarios: horarios as Prisma.InputJsonValue,
    direccion: {
      calle: get<string>(direccion, 'calle'),
      ciudad: get<string>(direccion, 'ciudad'),
      provincia: get<string>(direccion, 'provincia'),
      cp: get<string>(direccion, 'codigoPostal'),
      pais: get<string>(direccion, 'pais'),
    } as Prisma.InputJsonValue,
    redesSociales: (get<Record<string, unknown>>(f, 'redesSociales') ?? {}) as Prisma.InputJsonValue,
    seoConfig: ((): Prisma.InputJsonValue => {
      const s = get<Record<string, unknown>>(f, 'seo');
      if (!s) return Prisma.JsonNull as unknown as Prisma.InputJsonValue;
      return {
        title: fromI18nArray(s.titulo),
        description: fromI18nArray(s.descripcion),
      } as Prisma.InputJsonValue;
    })(),
    publishedStatus: 'published' as const, // los que lee el GROQ excluyen drafts
    lastPublishedAt: new Date(get<string>(f, '_updatedAt') ?? Date.now()),
  };
}

function mapServicios(f: SanityFarmacia): Prisma.ServicioCreateManyInput[] {
  const list = (get<Record<string, unknown>[]>(f, 'servicios') ?? []) as Record<string, unknown>[];
  return list.map((s, i) => ({
    businessId: '', // se asigna después
    icono: (s.icono as string) ?? null,
    nombre: fromI18nArray(s.nombre) as Prisma.InputJsonValue,
    descripcion: fromI18nArray(s.descripcion) as Prisma.InputJsonValue,
    enlace: s.enlace ? (s.enlace as Prisma.InputJsonValue) : (Prisma.JsonNull as unknown as Prisma.InputJsonValue),
    orden: i,
  }));
}

function mapFeatures(f: SanityFarmacia): Prisma.ContentFeatureCreateManyInput[] {
  const list = (get<Record<string, unknown>[]>(f, 'featuresLista') ?? []) as Record<string, unknown>[];
  return list.map((it, i) => ({
    businessId: '',
    icono: (it.icono as string) ?? null,
    titulo: fromI18nArray(it.titulo) as Prisma.InputJsonValue,
    descripcion: fromI18nArray(it.descripcion) as Prisma.InputJsonValue,
    orden: i,
  }));
}

function mapFaqs(f: SanityFarmacia): Prisma.FaqCreateManyInput[] {
  const list = (get<Record<string, unknown>[]>(f, 'faqs') ?? []) as Record<string, unknown>[];
  return list.map((it, i) => ({
    businessId: '',
    pregunta: fromI18nArray(it.pregunta) as Prisma.InputJsonValue,
    respuesta: fromI18nArray(it.respuesta) as Prisma.InputJsonValue,
    orden: i,
  }));
}

function mapContentImages(f: SanityFarmacia): Array<Omit<Prisma.ContentImageCreateManyInput, 'businessId'>> {
  const imgs: Array<Omit<Prisma.ContentImageCreateManyInput, 'businessId'>> = [];
  const heroArr = (get<Record<string, unknown>[]>(f, 'imagenes') ?? []) as Record<string, unknown>[];
  heroArr.forEach((img, i) => {
    const mapped = imageAssetToUrl(img);
    if (!mapped) return;
    imgs.push({
      role: 'hero',
      storageKey: `sanity:${mapped.url}`,
      publicUrl: mapped.url,
      alt: (mapped.alt ?? {}) as Prisma.InputJsonValue,
      orden: i,
    });
  });
  const sobreArr = (get<Record<string, unknown>[]>(f, 'imagenesSobre') ?? []) as Record<string, unknown>[];
  sobreArr.forEach((img, i) => {
    const mapped = imageAssetToUrl(img);
    if (!mapped) return;
    imgs.push({
      role: 'sobre',
      storageKey: `sanity:${mapped.url}`,
      publicUrl: mapped.url,
      alt: (mapped.alt ?? {}) as Prisma.InputJsonValue,
      orden: i,
    });
  });
  // El logo se almacena en Business.logoUrl (legacy) — no hace falta ContentImage(role='logo').
  return imgs;
}

// ──────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────

async function migrateOne(f: SanityFarmacia) {
  const businessData = mapFarmaciaToBusinessData(f);
  const slug = businessData.slug;
  if (!slug) throw new Error(`Farmacia sin slug: ${JSON.stringify(f._id)}`);

  const servicios = mapServicios(f);
  const features = mapFeatures(f);
  const faqs = mapFaqs(f);
  const images = mapContentImages(f);

  if (DRY_RUN) {
    console.log(`\n[dry-run] ${slug} → ${businessData.name}`);
    console.log(`  idiomas: ${JSON.stringify(businessData.idiomasActivos)}`);
    console.log(`  servicios: ${servicios.length}, features: ${features.length}, faqs: ${faqs.length}, imágenes: ${images.length}`);
    return 'dry-run';
  }

  const existing = await prisma.business.findUnique({ where: { slug }, select: { id: true } });

  const result = await prisma.$transaction(async (tx) => {
    const business = existing
      ? await tx.business.update({ where: { id: existing.id }, data: businessData, select: { id: true } })
      : await tx.business.create({ data: businessData, select: { id: true } });

    // Replace-all children
    await Promise.all([
      tx.servicio.deleteMany({ where: { businessId: business.id } }),
      tx.contentFeature.deleteMany({ where: { businessId: business.id } }),
      tx.faq.deleteMany({ where: { businessId: business.id } }),
      tx.contentImage.deleteMany({ where: { businessId: business.id, role: { in: ['hero', 'sobre'] } } }),
    ]);

    if (servicios.length)
      await tx.servicio.createMany({ data: servicios.map((s) => ({ ...s, businessId: business.id })) });
    if (features.length)
      await tx.contentFeature.createMany({ data: features.map((s) => ({ ...s, businessId: business.id })) });
    if (faqs.length)
      await tx.faq.createMany({ data: faqs.map((s) => ({ ...s, businessId: business.id })) });
    if (images.length)
      await tx.contentImage.createMany({ data: images.map((s) => ({ ...s, businessId: business.id })) });

    return existing ? 'updated' : 'created';
  });
  return result;
}

async function main() {
  console.log(`\n=== Migración Sanity → Neon ===`);
  console.log(`Project: ${SANITY_PROJECT_ID} · Dataset: ${SANITY_DATASET}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY-RUN (sin escribir)' : 'WRITE (escribe en Neon)'}`);
  if (TARGET_SLUG) console.log(`Filtro slug: ${TARGET_SLUG}`);
  console.log('');

  const docs = await sanityFetch<SanityFarmacia[]>(FARMACIA_GROQ);
  const all = TARGET_SLUG ? docs.filter((d) => d.slug === TARGET_SLUG) : docs;
  console.log(`${docs.length} farmacias leídas de Sanity, ${all.length} candidatas tras filtro.\n`);

  const stats = { created: 0, updated: 0, skipped: 0, errored: 0, dryRun: 0 };
  for (const f of all) {
    try {
      const res = await migrateOne(f);
      if (res === 'created') stats.created++;
      else if (res === 'updated') stats.updated++;
      else if (res === 'dry-run') stats.dryRun++;
      else stats.skipped++;
      if (!DRY_RUN) console.log(`  ✓ ${(f as { slug?: string }).slug} — ${res}`);
    } catch (e) {
      stats.errored++;
      console.error(`  ✗ ${(f as { slug?: string }).slug} — ${e instanceof Error ? e.message : e}`);
    }
  }

  console.log('\n=== Resumen ===');
  console.log(JSON.stringify(stats, null, 2));
  if (DRY_RUN) console.log('\nNada se escribió. Para escribir de verdad: añadir --write');
}

main()
  .catch((e) => {
    console.error('Fallo fatal:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
