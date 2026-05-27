/**
 * Crea datos mock para probar el componente <ResenasGoogle> de la landing:
 *   - Crea la farmacia "laguna" si no existe (mínimos campos).
 *   - Inserta 3 reseñas para "torrents" + 2 para "laguna".
 *
 * Sirve para verificar visualmente que cada landing sólo muestra SUS reseñas.
 *
 * IDs deterministas → re-ejecutar el script sobrescribe (createOrReplace),
 * no acumula duplicados.
 *
 * Uso:
 *   pnpm exec sanity exec scripts/mock-resenas.ts --with-user-token              # dry-run
 *   APLICAR=1 pnpm exec sanity exec scripts/mock-resenas.ts --with-user-token    # crea
 *   APLICAR=1 LIMPIAR=1 pnpm exec sanity exec scripts/mock-resenas.ts --with-user-token   # borra las mock
 */

import { getCliClient } from 'sanity/cli';

const DATASET = 'calendario';
const client = getCliClient({ apiVersion: '2024-10-01' }).withConfig({ dataset: DATASET });
const APLICAR = process.env.APLICAR === '1';
const LIMPIAR = process.env.LIMPIAR === '1';

if (client.config().dataset !== DATASET) {
  console.error(`✖ Script SOLO debe correr contra dataset "${DATASET}". Abortando.`);
  process.exit(1);
}

const SLUG_TORRENTS = process.env.TORRENTS_SLUG ?? 'torrents';
const SLUG_LAGUNA = process.env.LAGUNA_SLUG ?? 'laguna';
const ID_LAGUNA = `farmacia-${SLUG_LAGUNA}`;

const RESENAS = [
  {
    _id: 'resena-mock-torrents-1',
    farmaciaSlug: SLUG_TORRENTS,
    googleReviewId: 'mock-torrents-1',
    autorNombre: 'Maria López',
    rating: 5,
    comentario:
      'Trato excelente, muy profesionales y siempre con buen consejo. Mi farmacia de confianza desde hace años.',
    comentarioIdioma: 'es',
    fechaPublicacion: '2026-04-12T10:30:00Z',
    destacada: true,
  },
  {
    _id: 'resena-mock-torrents-2',
    farmaciaSlug: SLUG_TORRENTS,
    googleReviewId: 'mock-torrents-2',
    autorNombre: 'Pere Vidal',
    rating: 4,
    comentario:
      'Buen servicio, aunque a veces hay cola los sábados por la mañana. El personal es muy amable.',
    comentarioIdioma: 'ca',
    fechaPublicacion: '2026-05-02T16:15:00Z',
    respuestaOwner:
      '¡Gracias Pere! Estamos ampliando equipo precisamente para los sábados. Nos vemos pronto.',
    respuestaOwnerFecha: '2026-05-03T09:00:00Z',
  },
  {
    _id: 'resena-mock-torrents-3',
    farmaciaSlug: SLUG_TORRENTS,
    googleReviewId: 'mock-torrents-3',
    autorNombre: 'Anna García',
    rating: 5,
    comentario:
      'Encantadora la farmacéutica. Siempre nos ayuda con los problemas del peque y nos resuelve las dudas con paciencia.',
    comentarioIdioma: 'es',
    fechaPublicacion: '2026-05-18T11:00:00Z',
  },
  {
    _id: 'resena-mock-laguna-1',
    farmaciaSlug: SLUG_LAGUNA,
    googleReviewId: 'mock-laguna-1',
    autorNombre: 'Carlos Pérez',
    rating: 5,
    comentario: 'La mejor farmacia del barrio. Atención inmejorable.',
    comentarioIdioma: 'es',
    fechaPublicacion: '2026-04-25T14:00:00Z',
    destacada: true,
  },
  {
    _id: 'resena-mock-laguna-2',
    farmaciaSlug: SLUG_LAGUNA,
    googleReviewId: 'mock-laguna-2',
    autorNombre: 'Marta Ruiz',
    rating: 4,
    comentario: 'Bien surtida y el personal siempre dispuesto a aconsejar.',
    comentarioIdioma: 'es',
    fechaPublicacion: '2026-05-10T17:30:00Z',
  },
];

async function asegurarLaguna(): Promise<string | null> {
  const existente = await client.fetch<{ _id: string } | null>(
    `*[_type=="farmacia" && slug.current == $slug][0]{_id}`,
    { slug: SLUG_LAGUNA },
  );
  if (existente) {
    console.log(`  ✓ Farmacia "${SLUG_LAGUNA}" ya existe (${existente._id}).`);
    return existente._id;
  }
  console.log(`  → Crear farmacia "${SLUG_LAGUNA}" (id ${ID_LAGUNA}).`);
  if (!APLICAR) return null;

  await client.createIfNotExists({
    _id: ID_LAGUNA,
    _type: 'farmacia',
    nombre: 'Farmàcia Laguna',
    slug: { _type: 'slug', current: SLUG_LAGUNA },
    idiomasActivos: [
      { _key: 'lang-es', _type: 'reference', _ref: 'idioma-es' },
    ],
    direccion: { ciudad: 'Barcelona' },
    googleMapsUrl: 'https://maps.google.com/?cid=000000000000000000',
  });
  console.log(`    ✓ Creada.`);
  return ID_LAGUNA;
}

async function obtenerFarmaciaPorSlug(slug: string): Promise<string | null> {
  const doc = await client.fetch<{ _id: string } | null>(
    `*[_type=="farmacia" && slug.current == $slug][0]{_id}`,
    { slug },
  );
  return doc?._id ?? null;
}

async function main() {
  console.log(`Dataset: ${client.config().dataset}`);
  console.log(`Modo: ${APLICAR ? (LIMPIAR ? 'LIMPIAR' : 'APLICAR') : 'DRY-RUN'}\n`);

  if (LIMPIAR) {
    const ids = RESENAS.map((r) => r._id);
    console.log(`Borrando ${ids.length} reseñas mock + farmacia ${ID_LAGUNA}:`);
    if (!APLICAR) {
      console.log('  (dry-run, no escribe)');
      return;
    }
    const tx = client.transaction();
    for (const id of ids) tx.delete(id);
    tx.delete(ID_LAGUNA);
    await tx.commit({ visibility: 'async' });
    console.log('  ✓ Borrado.');
    return;
  }

  console.log('— Asegurando farmacias —');
  const idTorrents = await obtenerFarmaciaPorSlug(SLUG_TORRENTS);
  if (!idTorrents) {
    console.error(
      `✖ No existe la farmacia "${SLUG_TORRENTS}". Crea Torrents primero o pasa TORRENTS_SLUG=<otro> al script.`,
    );
    return;
  }
  console.log(`  ✓ Torrents → ${idTorrents}`);

  const idLaguna = await asegurarLaguna();
  if (!APLICAR && !idLaguna) {
    console.log(`  (dry-run) crearía ${ID_LAGUNA}`);
  }

  const idPorSlug: Record<string, string | null> = {
    [SLUG_TORRENTS]: idTorrents,
    [SLUG_LAGUNA]: idLaguna ?? ID_LAGUNA,
  };

  console.log(`\n— Reseñas (${RESENAS.length}) —`);
  for (const r of RESENAS) {
    const farmaciaId = idPorSlug[r.farmaciaSlug];
    if (!farmaciaId) {
      console.log(`  ✗ ${r._id}: sin farmacia "${r.farmaciaSlug}", salto.`);
      continue;
    }
    const ahora = new Date().toISOString();
    const doc = {
      _id: r._id,
      _type: 'resenaGoogle',
      farmacia: { _type: 'reference', _ref: farmaciaId },
      googleReviewId: r.googleReviewId,
      autorNombre: r.autorNombre,
      rating: r.rating,
      comentario: r.comentario,
      comentarioIdioma: r.comentarioIdioma,
      fechaPublicacion: r.fechaPublicacion,
      fechaActualizacion: r.fechaPublicacion,
      fechaSincronizacion: ahora,
      eliminadaEnGoogle: false,
      oculta: false,
      destacada: r.destacada ?? false,
      ...(r.respuestaOwner ? { respuestaOwner: r.respuestaOwner } : {}),
      ...(r.respuestaOwnerFecha ? { respuestaOwnerFecha: r.respuestaOwnerFecha } : {}),
    };
    console.log(
      `  → ${r._id} (${r.farmaciaSlug}, ★${r.rating}${r.destacada ? ' destacada' : ''})`,
    );
    if (APLICAR) {
      await client.createOrReplace(doc);
    }
  }

  console.log(
    `\n${APLICAR ? '✓' : '·'} ${APLICAR ? 'Creadas' : 'Crearía'} ${RESENAS.length} reseñas mock.`,
  );
  if (!APLICAR) {
    console.log(
      '\nPara aplicar: APLICAR=1 pnpm exec sanity exec scripts/mock-resenas.ts --with-user-token',
    );
    console.log(
      'Para borrar las mock: APLICAR=1 LIMPIAR=1 pnpm exec sanity exec scripts/mock-resenas.ts --with-user-token',
    );
  }
}

main().catch((err) => {
  console.error('Falló:', err);
  process.exit(1);
});
