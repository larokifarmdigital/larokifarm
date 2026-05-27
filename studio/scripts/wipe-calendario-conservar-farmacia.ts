/**
 * Vacía el dataset `calendario` conservando únicamente los documentos
 * `farmacia` y los idiomas canónicos (`idioma-es`, `idioma-en`,
 * `idioma-ca`). Re-apunta las referencias que arrancarían como dangling
 * (`farmacia.idiomasActivos`, `farmacia.comunidadPredeterminada`) para
 * dejar el dataset en un estado consistente listo para `pnpm seed:calendario`.
 *
 * Pasos:
 *   1. Para cada `farmacia`:
 *        - `idiomasActivos` → [idioma-es, idioma-en, idioma-ca].
 *        - `comunidadPredeterminada` → unset (la pones de nuevo después).
 *   2. Borra todos los docs de tipos:
 *        comunidad, vacuna, dosis, enfermedad, fuenteOficial,
 *        paginaLegal, farmaciaPartner.
 *   3. Borra los `idioma` que NO sean idioma-es/en/ca.
 *
 * Dry-run por defecto. APLICAR=1 ejecuta.
 *
 * Uso:
 *   pnpm exec sanity exec scripts/wipe-calendario-conservar-farmacia.ts --with-user-token
 *   APLICAR=1 pnpm exec sanity exec scripts/wipe-calendario-conservar-farmacia.ts --with-user-token
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

const IDIOMAS_CANONICOS = ['idioma-es', 'idioma-en', 'idioma-ca'];

const TIPOS_A_BORRAR = [
  'comunidad',
  'vacuna',
  'dosis',
  'enfermedad',
  'fuenteOficial',
  'paginaLegal',
  'farmaciaPartner',
];

function refIdioma(id: string) {
  return { _key: randomUUID(), _type: 'reference' as const, _ref: id };
}

async function main() {
  console.log(`Dataset: ${client.config().dataset}`);
  console.log(`Modo: ${APLICAR ? 'APLICAR (escribe)' : 'DRY-RUN (no escribe)'}\n`);

  // 1. Re-apuntar farmacias
  const farmacias = await client.fetch<
    {
      _id: string;
      idiomasActivos?: { _ref?: string }[];
      comunidadPredeterminada?: { _ref?: string };
    }[]
  >(
    `*[_type=="farmacia"]{_id, idiomasActivos, comunidadPredeterminada}`,
  );
  console.log(`Farmacias encontradas: ${farmacias.length}`);
  for (const f of farmacias) {
    const cambios: Record<string, unknown> = {};
    const unset: string[] = [];

    const refsActuales = (f.idiomasActivos ?? []).map((r) => r._ref).filter(Boolean);
    const yaCanonicas =
      refsActuales.length === 3 &&
      IDIOMAS_CANONICOS.every((c) => refsActuales.includes(c));
    if (!yaCanonicas) {
      cambios.idiomasActivos = IDIOMAS_CANONICOS.map(refIdioma);
    }
    if (f.comunidadPredeterminada?._ref) {
      unset.push('comunidadPredeterminada');
    }

    if (Object.keys(cambios).length === 0 && unset.length === 0) {
      console.log(`  ✓ ${f._id}: ya limpio.`);
      continue;
    }
    console.log(
      `  → ${f._id}: ${Object.keys(cambios).length > 0 ? 'set ' + Object.keys(cambios).join(',') : ''} ${unset.length > 0 ? 'unset ' + unset.join(',') : ''}`.trim(),
    );
    if (APLICAR) {
      let p = client.patch(f._id);
      if (Object.keys(cambios).length > 0) p = p.set(cambios);
      if (unset.length > 0) p = p.unset(unset);
      await p.commit();
    }
  }

  // 2. Borrar tipos de calendario
  console.log('\nBorrando documentos por tipo:');
  for (const tipo of TIPOS_A_BORRAR) {
    const docs = await client.fetch<{ _id: string }[]>(
      `*[_type==$tipo]{_id}`,
      { tipo },
    );
    console.log(`  ${tipo}: ${docs.length} doc(s)`);
    if (docs.length === 0) continue;
    if (APLICAR) {
      const TAM = 50;
      for (let i = 0; i < docs.length; i += TAM) {
        const lote = docs.slice(i, i + TAM);
        const tx = client.transaction();
        for (const d of lote) tx.delete(d._id);
        await tx.commit({ visibility: 'async' });
      }
      console.log(`    ✓ ${docs.length} borrados.`);
    }
  }

  // 3. Borrar idiomas no canónicos
  const idiomasOtros = await client.fetch<{ _id: string; codigo?: string }[]>(
    `*[_type=="idioma" && !(_id in $ids)]{_id, codigo}`,
    { ids: IDIOMAS_CANONICOS },
  );
  console.log(`\nIdiomas no canónicos a borrar: ${idiomasOtros.length}`);
  for (const i of idiomasOtros) {
    console.log(`  → ${i._id} (codigo=${i.codigo})`);
    if (APLICAR) {
      try {
        await client.delete(i._id);
      } catch (e) {
        console.error(
          `    ✖ No se pudo borrar ${i._id}: ${(e as Error).message}`,
        );
      }
    }
  }

  console.log(
    `\n${APLICAR ? '✓ Limpieza aplicada.' : '· Dry-run completado.'} Quedan en pie: farmacia + idioma-es/en/ca.`,
  );
  if (APLICAR) {
    console.log('\nSiguiente paso:  pnpm seed:calendario');
  } else {
    console.log(
      '\nPara aplicar: APLICAR=1 pnpm exec sanity exec scripts/wipe-calendario-conservar-farmacia.ts --with-user-token',
    );
  }
}

main().catch((err) => {
  console.error('Falló:', err);
  process.exit(1);
});
