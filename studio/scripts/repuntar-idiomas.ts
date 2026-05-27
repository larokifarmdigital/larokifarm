/**
 * Re-apunta todas las referencias a docs `idioma` huérfanos hacia los
 * canónicos `idioma-es`, `idioma-en` e `idioma-ca`.
 *
 * Pasos:
 *   1. Localiza los docs `idioma` canónicos (idioma-es/en/ca).
 *   2. Para cualquier OTRO doc `idioma` (los que arrastras de antes,
 *      ahora con codigo ro/pt/fr o lo que sea), lista qué docs lo
 *      referencian.
 *   3. En cada doc que referencia (farmacia, comunidad, etc.) sustituye
 *      `idiomasActivos` por refs a los 3 canónicos.
 *   4. Borra los docs `idioma` no canónicos (ya sin referencias).
 *
 * Dry-run por defecto. APLICAR=1 ejecuta los cambios.
 *
 * Uso:
 *   pnpm exec sanity exec scripts/repuntar-idiomas.ts --with-user-token              # dry-run
 *   APLICAR=1 pnpm exec sanity exec scripts/repuntar-idiomas.ts --with-user-token    # aplica
 */

import { getCliClient } from 'sanity/cli';
import { randomUUID } from 'node:crypto';

const DATASET = 'calendario';
const client = getCliClient({ apiVersion: '2024-10-01' }).withConfig({ dataset: DATASET });
const APLICAR = process.env.APLICAR === '1';

if (client.config().dataset !== DATASET) {
  console.error(`✖ Script SOLO debe correr contra dataset "${DATASET}". Abortando.`);
  process.exit(1);
}

const CANONICOS = ['idioma-es', 'idioma-en', 'idioma-ca'];

function refIdioma(id: string) {
  return { _key: randomUUID(), _type: 'reference' as const, _ref: id };
}

async function main() {
  console.log(`Dataset: ${client.config().dataset}`);
  console.log(`Modo: ${APLICAR ? 'APLICAR (escribe)' : 'DRY-RUN (no escribe)'}\n`);

  // 1. Verificar que los canónicos existen
  const existen = await client.fetch<{ _id: string; codigo?: string; nombre?: string }[]>(
    `*[_type=="idioma" && _id in $ids]{_id, codigo, nombre}`,
    { ids: CANONICOS },
  );
  console.log('Idiomas canónicos:');
  for (const i of existen) {
    console.log(`  ✓ ${i._id} (codigo=${i.codigo}, nombre=${i.nombre})`);
  }
  if (existen.length !== 3) {
    console.error(
      `\n✖ Faltan canónicos. Esperaba 3 (idioma-es/en/ca), encontré ${existen.length}.`,
    );
    console.error('  Ejecuta primero `pnpm seed:calendario` para crearlos.');
    return;
  }

  // 2. Listar idiomas NO canónicos
  const noCanonicos = await client.fetch<{ _id: string; codigo?: string; nombre?: string }[]>(
    `*[_type=="idioma" && !(_id in $ids)]{_id, codigo, nombre}`,
    { ids: CANONICOS },
  );
  console.log(`\nIdiomas no canónicos (a retirar): ${noCanonicos.length}`);
  for (const i of noCanonicos) {
    console.log(`  • ${i._id} (codigo=${i.codigo}, nombre=${i.nombre})`);
  }
  if (noCanonicos.length === 0) {
    console.log('\n✓ No hay idiomas huérfanos. Nada que hacer.');
    return;
  }

  const idsNoCanonicos = noCanonicos.map((i) => i._id);

  // 3. Encontrar todos los docs que referencian a idiomas no canónicos
  const docsAfectados = await client.fetch<
    { _id: string; _type: string; idiomasActivos?: { _ref?: string }[] }[]
  >(
    `*[references($ids)]{_id, _type, idiomasActivos}`,
    { ids: idsNoCanonicos },
  );
  console.log(`\nDocumentos que referencian idiomas no canónicos: ${docsAfectados.length}`);

  // 4. Re-apuntar
  let reapuntados = 0;
  for (const doc of docsAfectados) {
    const ia = doc.idiomasActivos ?? [];
    const tieneNoCanonicos = ia.some((r) => r._ref && idsNoCanonicos.includes(r._ref));
    if (!tieneNoCanonicos) {
      console.log(
        `  · ${doc._id} (${doc._type}) referencia un idioma huérfano fuera de idiomasActivos — revísalo manualmente.`,
      );
      continue;
    }

    // Sustituye TODO idiomasActivos por refs a los 3 canónicos.
    const nuevoIA = CANONICOS.map(refIdioma);
    console.log(`  → ${doc._id} (${doc._type}): idiomasActivos pasa a [es,en,ca]`);
    if (APLICAR) {
      await client.patch(doc._id).set({ idiomasActivos: nuevoIA }).commit();
    }
    reapuntados++;
  }

  // 5. Borrar idiomas huérfanos (ya sin refs)
  console.log(`\nBorrando ${noCanonicos.length} idioma(s) no canónicos:`);
  for (const i of noCanonicos) {
    console.log(`  → borrar ${i._id}`);
    if (APLICAR) {
      try {
        await client.delete(i._id);
      } catch (e) {
        console.error(`    ✖ No se pudo borrar ${i._id}: ${(e as Error).message}`);
      }
    }
  }

  console.log(
    `\n${APLICAR ? '✓' : '·'} ${reapuntados} doc(s) re-apuntados, ${noCanonicos.length} idioma(s) huérfanos ${APLICAR ? 'borrados' : 'a borrar (dry-run)'}.`,
  );
  if (!APLICAR) {
    console.log(
      '\nPara aplicar: APLICAR=1 pnpm exec sanity exec scripts/repuntar-idiomas.ts --with-user-token',
    );
  }
}

main().catch((err) => {
  console.error('Falló:', err);
  process.exit(1);
});
