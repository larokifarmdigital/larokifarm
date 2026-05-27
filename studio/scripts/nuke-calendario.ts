/**
 * Borra TODO el dataset `calendario` excepto los documentos `farmacia`.
 * Versión agresiva: borra todos los idiomas (incluso los canónicos), todos
 * los docs del calendario y limpia las referencias huérfanas que pudieran
 * quedar en farmacia.
 *
 * Pasos:
 *   1. Para cada `farmacia` quita `idiomasActivos` y `comunidadPredeterminada`
 *      (sus refs van a quedar colgando porque borramos sus destinos).
 *   2. Borra cualquier doc que NO sea de tipo `farmacia`.
 *
 * Tras ejecutar este script:
 *   - Sólo quedan los docs farmacia, sin `idiomasActivos` ni
 *     `comunidadPredeterminada`.
 *   - El dataset está listo para `pnpm seed:calendario`.
 *   - Después abre farmacia en el Studio y vuelve a rellenar
 *     `idiomasActivos` y `comunidadPredeterminada` manualmente.
 *
 * Dry-run por defecto. CONFIRMAR=1 ejecuta.
 *
 * Uso:
 *   pnpm exec sanity exec scripts/nuke-calendario.ts --with-user-token              # dry-run
 *   CONFIRMAR=1 pnpm exec sanity exec scripts/nuke-calendario.ts --with-user-token  # borra
 */

import { getCliClient } from 'sanity/cli';

const DATASET = 'calendario';
const client = getCliClient({ apiVersion: '2024-10-01' }).withConfig({ dataset: DATASET });
const CONFIRMAR = process.env.CONFIRMAR === '1';

if (client.config().dataset !== DATASET) {
  console.error(`✖ Script SOLO debe correr contra dataset "${DATASET}", está en "${client.config().dataset}". Abortando.`);
  process.exit(1);
}

async function main() {
  console.log(`Dataset: ${client.config().dataset}`);
  console.log(`Modo: ${CONFIRMAR ? 'BORRA' : 'DRY-RUN (no escribe)'}\n`);

  // 1. Limpiar refs en farmacia
  const farmacias = await client.fetch<
    {
      _id: string;
      idiomasActivos?: unknown;
      comunidadPredeterminada?: unknown;
    }[]
  >(`*[_type=="farmacia"]{_id, idiomasActivos, comunidadPredeterminada}`);
  console.log(`Farmacias: ${farmacias.length}`);
  for (const f of farmacias) {
    const aQuitar: string[] = [];
    if (f.idiomasActivos !== undefined) aQuitar.push('idiomasActivos');
    if (f.comunidadPredeterminada !== undefined) aQuitar.push('comunidadPredeterminada');
    if (aQuitar.length === 0) {
      console.log(`  · ${f._id}: ya sin refs.`);
      continue;
    }
    console.log(`  → ${f._id}: unset ${aQuitar.join(', ')}`);
    if (CONFIRMAR) {
      await client.patch(f._id).unset(aQuitar).commit();
    }
  }

  // 2. Borrar TODO menos farmacia (incluye drafts)
  const docs = await client.fetch<{ _id: string; _type: string }[]>(
    `*[_type != "farmacia" && !(_id in path("_.**"))]{_id, _type}`,
  );
  const porTipo = new Map<string, number>();
  for (const d of docs) porTipo.set(d._type, (porTipo.get(d._type) ?? 0) + 1);
  console.log(`\nDocs a borrar: ${docs.length}`);
  for (const [tipo, n] of [...porTipo.entries()].sort()) {
    console.log(`  ${tipo}: ${n}`);
  }

  if (docs.length === 0) {
    console.log('\n✓ Nada que borrar.');
    return;
  }

  if (!CONFIRMAR) {
    console.log(
      '\nPara ejecutar: CONFIRMAR=1 pnpm exec sanity exec scripts/nuke-calendario.ts --with-user-token',
    );
    return;
  }

  const ids = docs.map((d) => d._id);
  const TAM = 50;
  let borrados = 0;
  for (let i = 0; i < ids.length; i += TAM) {
    const lote = ids.slice(i, i + TAM);
    const tx = client.transaction();
    for (const id of lote) tx.delete(id);
    try {
      await tx.commit({ visibility: 'async' });
      borrados += lote.length;
      console.log(`  ✓ ${borrados}/${ids.length}`);
    } catch (e) {
      console.error(`  ✖ Lote ${i}-${i + lote.length} falló: ${(e as Error).message}`);
      // reintentar uno por uno por si el lote tenía refs cruzadas
      for (const id of lote) {
        try {
          await client.delete(id);
          borrados++;
        } catch (e2) {
          console.error(`    ✖ ${id}: ${(e2 as Error).message}`);
        }
      }
    }
  }

  console.log(`\n✓ ${borrados}/${ids.length} docs borrados.`);
  console.log('\nSiguiente paso:');
  console.log('  pnpm seed:calendario');
  console.log(
    '  (después abre farmacia en el Studio y rellena idiomasActivos + comunidadPredeterminada manualmente)',
  );
}

main().catch((err) => {
  console.error('Falló:', err);
  process.exit(1);
});
