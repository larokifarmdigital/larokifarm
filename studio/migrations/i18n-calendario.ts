/**
 * Migración i18n para los documentos del calendario:
 *   comunidad, vacuna, dosis, enfermedad.
 *
 * Pasos:
 *   1. Asegura que existen los documentos `idioma` base (`idioma-es`,
 *      `idioma-en`, `idioma-ca`). Idempotente.
 *   2. Para cada documento:
 *      - Si `idiomasActivos` no existe o está vacío → set referencia a `idioma-es`.
 *      - Envuelve los campos i18n con valores planos en el formato v5 del
 *        plugin: `[{ _key, language: 'es', value: <existente> }]`.
 *      - En `comunidad.gruposEdad[]` envuelve también:
 *          · grupoEdad.descripcion
 *          · grupoEdad.entradas[].notaEspecifica
 *
 * Idempotente. Detecta y respeta documentos ya migrados.
 *
 * Uso:
 *   pnpm exec sanity dataset export calendario backups/calendario-pre-i18n.tar.gz
 *   pnpm exec sanity exec migrations/i18n-calendario.ts --with-user-token   # dry-run
 *   APLICAR=1 pnpm exec sanity exec migrations/i18n-calendario.ts --with-user-token
 */

import { getCliClient } from 'sanity/cli';
import { randomUUID } from 'node:crypto';

const DATASET = 'calendario';
const client = getCliClient({ apiVersion: '2024-10-01' }).withConfig({ dataset: DATASET });
const APLICAR = process.env.APLICAR === '1';
const IDIOMA_DEFECTO = 'es';

if (client.config().dataset !== DATASET) {
  console.error(`✖ Script SOLO debe correr contra dataset "${DATASET}". Abortando.`);
  process.exit(1);
}

const IDIOMAS_BASE = [
  { codigo: 'es', nombre: 'Español' },
  { codigo: 'en', nombre: 'English' },
  { codigo: 'ca', nombre: 'Català' },
];

const idiomaIdPara = (codigo: string) => `idioma-${codigo.toLowerCase()}`;

function esV5I18n(valor: unknown): boolean {
  if (!Array.isArray(valor)) return false;
  return (
    valor.length > 0 &&
    valor.every(
      (e) =>
        e &&
        typeof e === 'object' &&
        'language' in (e as object) &&
        'value' in (e as object),
    )
  );
}

function esV4I18n(valor: unknown): boolean {
  if (!Array.isArray(valor)) return false;
  return (
    valor.length > 0 &&
    valor.every(
      (e) =>
        e &&
        typeof e === 'object' &&
        '_key' in (e as object) &&
        'value' in (e as object) &&
        !('language' in (e as object)),
    )
  );
}

function v4Av5(valor: unknown): unknown {
  if (!esV4I18n(valor)) return valor;
  return (valor as { _key: string; value: unknown }[]).map((e) => ({
    _key: randomUUID(),
    language: e._key,
    value: e.value,
  }));
}

function entradaI18n<T>(valor: T) {
  return [{ _key: randomUUID(), language: IDIOMA_DEFECTO, value: valor }];
}

function envolverString(valor: unknown): unknown {
  if (valor === undefined || valor === null) return valor;
  if (esV4I18n(valor)) return v4Av5(valor);
  if (esV5I18n(valor)) return valor;
  if (typeof valor === 'string') return entradaI18n(valor);
  return valor;
}

function envolverText(valor: unknown): unknown {
  if (valor === undefined || valor === null) return valor;
  if (esV4I18n(valor)) return v4Av5(valor);
  if (esV5I18n(valor)) return valor;
  if (typeof valor === 'string') return entradaI18n(valor);
  return valor;
}

function refIdioma(codigo: string) {
  return { _type: 'reference', _ref: idiomaIdPara(codigo), _key: randomUUID() };
}

async function asegurarIdiomas() {
  const ids = IDIOMAS_BASE.map((i) => idiomaIdPara(i.codigo));
  const existentes = await client.fetch<{ _id: string }[]>(
    `*[_type=="idioma" && _id in $ids]{_id}`,
    { ids },
  );
  const yaExisten = new Set(existentes.map((d) => d._id));

  const aCrear = IDIOMAS_BASE.filter((i) => !yaExisten.has(idiomaIdPara(i.codigo)));
  if (aCrear.length === 0) {
    console.log('✓ Idiomas base ya existen.');
    return;
  }
  console.log(`→ Crear ${aCrear.length} idiomas: ${aCrear.map((a) => a.codigo).join(', ')}`);
  if (APLICAR) {
    for (const i of aCrear) {
      await client.createIfNotExists({
        _id: idiomaIdPara(i.codigo),
        _type: 'idioma',
        codigo: i.codigo,
        nombre: i.nombre,
      });
      console.log(`  ✓ Creado idioma-${i.codigo}`);
    }
  }
}

function patchIdiomasActivos(doc: Record<string, unknown>): unknown[] | null {
  const ia = doc.idiomasActivos;
  if (!Array.isArray(ia) || ia.length === 0) {
    return [refIdioma(IDIOMA_DEFECTO)];
  }
  const items = ia as Record<string, unknown>[];
  // Limpia objetos antiguos {codigo,nombre} sin _ref
  const sonObjetosAntiguos = items.some(
    (i) => !('_ref' in i) && 'codigo' in i,
  );
  const tienenExtras = items.some(
    (i) => '_ref' in i && ('codigo' in i || 'nombre' in i),
  );
  if (!sonObjetosAntiguos && !tienenExtras) return null;

  return items
    .map((i) => {
      if (typeof i._ref === 'string' && i._ref) {
        return {
          _key: (typeof i._key === 'string' && i._key) || randomUUID(),
          _type: 'reference' as const,
          _ref: i._ref,
        };
      }
      const codigo = typeof i.codigo === 'string' ? i.codigo : undefined;
      if (codigo) {
        return {
          _key: (typeof i._key === 'string' && i._key) || randomUUID(),
          _type: 'reference' as const,
          _ref: idiomaIdPara(codigo),
        };
      }
      return null;
    })
    .filter(Boolean) as unknown[];
}

async function migrarComunidad(doc: Record<string, unknown>) {
  const patch: Record<string, unknown> = {};

  const ia = patchIdiomasActivos(doc);
  if (ia !== null) patch.idiomasActivos = ia;

  if (!esV5I18n(doc.nombre)) patch.nombre = envolverString(doc.nombre);
  if (!esV5I18n(doc.notaCabecera)) patch.notaCabecera = envolverText(doc.notaCabecera);

  const grupos = doc.gruposEdad as Record<string, unknown>[] | undefined;
  if (Array.isArray(grupos)) {
    const necesita = grupos.some((g) => {
      if (g.descripcion !== undefined && !esV5I18n(g.descripcion)) return true;
      const entradas = g.entradas as Record<string, unknown>[] | undefined;
      if (Array.isArray(entradas)) {
        return entradas.some(
          (e) => e.notaEspecifica !== undefined && !esV5I18n(e.notaEspecifica),
        );
      }
      return false;
    });
    if (necesita) {
      patch.gruposEdad = grupos.map((g) => {
        const grupoNuevo: Record<string, unknown> = { ...g };
        if (g.descripcion !== undefined && !esV5I18n(g.descripcion)) {
          grupoNuevo.descripcion = envolverString(g.descripcion);
        }
        const entradas = g.entradas as Record<string, unknown>[] | undefined;
        if (Array.isArray(entradas)) {
          grupoNuevo.entradas = entradas.map((e) => {
            if (e.notaEspecifica !== undefined && !esV5I18n(e.notaEspecifica)) {
              return { ...e, notaEspecifica: envolverText(e.notaEspecifica) };
            }
            return e;
          });
        }
        return grupoNuevo;
      });
    }
  }

  return patch;
}

async function migrarVacuna(doc: Record<string, unknown>) {
  const patch: Record<string, unknown> = {};
  const ia = patchIdiomasActivos(doc);
  if (ia !== null) patch.idiomasActivos = ia;
  if (!esV5I18n(doc.nombre)) patch.nombre = envolverString(doc.nombre);
  if (!esV5I18n(doc.notaGeneral)) patch.notaGeneral = envolverText(doc.notaGeneral);
  return patch;
}

async function migrarDosis(doc: Record<string, unknown>) {
  const patch: Record<string, unknown> = {};
  const ia = patchIdiomasActivos(doc);
  if (ia !== null) patch.idiomasActivos = ia;
  if (!esV5I18n(doc.etiqueta)) patch.etiqueta = envolverString(doc.etiqueta);
  if (!esV5I18n(doc.edadAplicacion)) patch.edadAplicacion = envolverString(doc.edadAplicacion);
  return patch;
}

async function migrarEnfermedad(doc: Record<string, unknown>) {
  const patch: Record<string, unknown> = {};
  const ia = patchIdiomasActivos(doc);
  if (ia !== null) patch.idiomasActivos = ia;
  if (!esV5I18n(doc.nombre)) patch.nombre = envolverString(doc.nombre);
  if (!esV5I18n(doc.descripcion)) patch.descripcion = envolverText(doc.descripcion);
  return patch;
}

const MIGRADORES = {
  comunidad: migrarComunidad,
  vacuna: migrarVacuna,
  dosis: migrarDosis,
  enfermedad: migrarEnfermedad,
} as const;

async function migrarTipo(tipo: keyof typeof MIGRADORES) {
  const docs = await client.fetch<Record<string, unknown>[]>(
    `*[_type == $tipo]`,
    { tipo },
  );
  console.log(`\n— ${tipo}: ${docs.length} documento(s) —`);
  let cambiados = 0;
  for (const doc of docs) {
    const patch = await MIGRADORES[tipo](doc);
    const campos = Object.keys(patch);
    if (campos.length === 0) {
      console.log(`  ✓ ${doc._id} ya migrado.`);
      continue;
    }
    cambiados++;
    console.log(`  → ${doc._id} migrar campos: ${campos.join(', ')}`);
    if (APLICAR) {
      await client.patch(doc._id as string).set(patch).commit();
      console.log(`    ✓ Guardado.`);
    }
  }
  console.log(
    `  Total ${tipo}: ${cambiados}/${docs.length} ${APLICAR ? 'migrados' : 'a migrar (dry-run)'}.`,
  );
}

async function main() {
  console.log(`Modo: ${APLICAR ? 'APLICAR (escribe)' : 'DRY-RUN (no escribe)'}\n`);

  console.log('— Paso 1: asegurar idiomas base —');
  await asegurarIdiomas();

  console.log('\n— Paso 2: migrar documentos del calendario —');
  for (const tipo of Object.keys(MIGRADORES) as (keyof typeof MIGRADORES)[]) {
    await migrarTipo(tipo);
  }

  if (!APLICAR) {
    console.log(
      '\nPara aplicar: APLICAR=1 pnpm exec sanity exec migrations/i18n-calendario.ts --with-user-token',
    );
  }
}

main().catch((err) => {
  console.error('Migración falló:', err);
  process.exit(1);
});
