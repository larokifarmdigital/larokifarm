/**
 * Vacía completamente el dataset `calendario`: borra TODOS los documentos
 * (no toca assets / imágenes subidas).
 *
 * Dry-run por defecto. Para borrar de verdad, exporta CONFIRMAR=1.
 *
 * Uso:
 *   pnpm exec sanity exec scripts/wipe-calendario.ts --with-user-token              # dry-run
 *   CONFIRMAR=1 pnpm exec sanity exec scripts/wipe-calendario.ts --with-user-token  # borra
 */

import { getCliClient } from 'sanity/cli';

const DATASET = 'calendario';
const client = getCliClient({ apiVersion: '2024-10-01' }).withConfig({ dataset: DATASET });
const CONFIRMAR = process.env.CONFIRMAR === '1';

if (client.config().dataset !== DATASET) {
  console.error(`✖ Script SOLO debe correr contra dataset "${DATASET}". Abortando.`);
  process.exit(1);
}

async function main() {
  console.log(`Dataset: ${client.config().dataset}`);
  console.log(`Modo: ${CONFIRMAR ? 'BORRA' : 'DRY-RUN (no escribe)'}\n`);

  const docs = await client.fetch<{ _id: string; _type: string }[]>(
    `*[!(_id in path("_.**"))]{ _id, _type } | order(_type asc, _id asc)`,
  );

  if (docs.length === 0) {
    console.log('✓ Dataset ya vacío.');
    return;
  }

  const porTipo = new Map<string, number>();
  for (const d of docs) {
    porTipo.set(d._type, (porTipo.get(d._type) ?? 0) + 1);
  }
  console.log(`Encontrados ${docs.length} documentos:`);
  for (const [tipo, n] of [...porTipo.entries()].sort()) {
    console.log(`  ${tipo}: ${n}`);
  }

  if (!CONFIRMAR) {
    console.log(
      '\nDry-run. Para borrar: CONFIRMAR=1 pnpm exec sanity exec scripts/wipe-calendario.ts --with-user-token',
    );
    return;
  }

  const ids = docs.map((d) => d._id);
  const TAM_LOTE = 50;
  let borrados = 0;
  for (let i = 0; i < ids.length; i += TAM_LOTE) {
    const lote = ids.slice(i, i + TAM_LOTE);
    const tx = client.transaction();
    for (const id of lote) tx.delete(id);
    await tx.commit({ visibility: 'async' });
    borrados += lote.length;
    console.log(`  ✓ Borrados ${borrados}/${ids.length}`);
  }
  console.log('\n✓ Dataset vaciado.');
}

main().catch((err) => {
  console.error('Wipe falló:', err);
  process.exit(1);
});
