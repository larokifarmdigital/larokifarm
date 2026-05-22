/**
 * Migración i18n para Farmacia.
 *
 * Pasos:
 *   1. Crea los documentos `idioma` base (`idioma-es`, `idioma-en`, `idioma-ca`)
 *      si no existen. _id determinístico para que la referencia sea estable.
 *      Lee idiomas previos del documento `configuracion` si todavía existe
 *      y los porta como docs sueltos.
 *   2. Borra el documento `configuracion` legacy si existe.
 *   3. Para cada farmacia:
 *      - Si `idiomasActivos` no existe o está vacío → set referencia a `idioma-es`.
 *      - Si tiene objetos `{codigo, nombre}` (formato antiguo) → convierte a refs.
 *      - Para cada campo i18n con valor plano (string o PT) → envuelve en
 *        `[{ _key, language: 'es', value: <existente> }]`.
 *
 * Idempotente.
 *
 * Uso:
 *   pnpm exec sanity dataset export calendario backups/calendario-pre-i18n.tar.gz
 *   pnpm exec sanity exec migrations/i18n-farmacia.ts --with-user-token   # dry-run
 *   APLICAR=1 pnpm exec sanity exec migrations/i18n-farmacia.ts --with-user-token
 */

import { getCliClient } from 'sanity/cli';
import { randomUUID } from 'node:crypto';

const client = getCliClient({ apiVersion: '2024-10-01' });
const APLICAR = process.env.APLICAR === '1';
const IDIOMA_DEFECTO = 'es';

type Bloque = { _type?: string };

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

/**
 * Detecta el formato v4 de sanity-plugin-internationalized-array:
 *   [{ _key: 'es', value: '...' }]  ← _key guarda el idioma
 * En v5 el idioma vive en un campo `language` y `_key` es un uuid.
 */
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

function envolverPortableText(valor: unknown): unknown {
  if (valor === undefined || valor === null) return valor;
  if (esV4I18n(valor)) return v4Av5(valor);
  if (esV5I18n(valor)) return valor;
  if (Array.isArray(valor)) {
    const pareceBlocks = valor.every(
      (b: Bloque) => b && typeof b === 'object' && typeof b._type === 'string',
    );
    if (pareceBlocks) return entradaI18n(valor);
  }
  return valor;
}

function envolverArrayStrings(valor: unknown): unknown {
  if (!Array.isArray(valor)) return valor;
  return valor.map((v) => envolverString(v));
}

const idiomaIdPara = (codigo: string) => `idioma-${codigo.toLowerCase()}`;

const IDIOMAS_BASE = [
  { codigo: 'es', nombre: 'Español' },
  { codigo: 'en', nombre: 'English' },
  { codigo: 'ca', nombre: 'Català' },
];

async function asegurarIdiomas() {
  // Lee Configuración legacy si todavía existe
  const cfg = await client.fetch<{
    _id: string;
    idiomas?: { codigo?: string; nombre?: string }[];
  } | null>(`*[_type=="configuracion"][0]{_id, idiomas}`);

  const idiomasAcrear = new Map<string, { codigo: string; nombre: string }>();
  for (const i of IDIOMAS_BASE) idiomasAcrear.set(i.codigo, i);
  for (const i of cfg?.idiomas ?? []) {
    if (i.codigo && i.nombre) idiomasAcrear.set(i.codigo, { codigo: i.codigo, nombre: i.nombre });
  }

  const ids = [...idiomasAcrear.values()].map((i) => idiomaIdPara(i.codigo));
  const existentes = await client.fetch<{ _id: string }[]>(
    `*[_type=="idioma" && _id in $ids]{_id}`,
    { ids },
  );
  const yaExisten = new Set(existentes.map((d) => d._id));

  const aCrear: { _id: string; codigo: string; nombre: string }[] = [];
  for (const i of idiomasAcrear.values()) {
    const _id = idiomaIdPara(i.codigo);
    if (!yaExisten.has(_id)) {
      aCrear.push({ _id, codigo: i.codigo, nombre: i.nombre });
    }
  }

  if (aCrear.length === 0) {
    console.log('✓ Todos los idiomas base ya existen.');
  } else {
    console.log(`→ Crear ${aCrear.length} idiomas: ${aCrear.map((a) => a.codigo).join(', ')}`);
    if (APLICAR) {
      for (const i of aCrear) {
        await client.createIfNotExists({
          _id: i._id,
          _type: 'idioma',
          codigo: i.codigo,
          nombre: i.nombre,
        });
        console.log(`  ✓ Creado ${i._id}`);
      }
    }
  }

  // Borrar Configuración legacy si existe
  if (cfg?._id) {
    console.log(`→ Borrar documento legacy ${cfg._id}`);
    if (APLICAR) {
      await client.delete(cfg._id);
      console.log(`  ✓ Borrado.`);
    }
  }
}

function refIdioma(codigo: string) {
  return { _type: 'reference', _ref: idiomaIdPara(codigo), _key: randomUUID() };
}

async function migrarUnaFarmacia(doc: Record<string, unknown>) {
  const patch: Record<string, unknown> = {};

  // idiomasActivos
  const ia = doc.idiomasActivos;
  if (!Array.isArray(ia) || ia.length === 0) {
    patch.idiomasActivos = [refIdioma(IDIOMA_DEFECTO)];
  } else {
    const items = ia as Record<string, unknown>[];

    // Caso A: hay items con _ref pero arrastran campos extra (codigo/nombre)
    //         → solo dejar { _key, _type:'reference', _ref }.
    const tienenExtras = items.some(
      (i) => '_ref' in i && ('codigo' in i || 'nombre' in i),
    );

    // Caso B: items en formato antiguo, sin _ref pero con codigo → convertir a refs.
    const sonObjetosAntiguos = items.some(
      (i) => !('_ref' in i) && 'codigo' in i,
    );

    if (tienenExtras || sonObjetosAntiguos) {
      patch.idiomasActivos = items
        .map((i) => {
          // Si ya tiene _ref, conservarlo limpio
          if (typeof i._ref === 'string' && i._ref) {
            return {
              _key: (typeof i._key === 'string' && i._key) || randomUUID(),
              _type: 'reference' as const,
              _ref: i._ref,
            };
          }
          // Si no tiene _ref pero tiene codigo, crear ref a partir del codigo
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
        .filter(Boolean);
    }
  }

  if (!esV5I18n(doc.descripcionCorta)) {
    patch.descripcionCorta = envolverString(doc.descripcionCorta);
  }
  if (!esV5I18n(doc.descripcionLarga)) {
    patch.descripcionLarga = envolverPortableText(doc.descripcionLarga);
  }

  const sobre = doc.sobreNosotros as Record<string, unknown> | undefined;
  if (sobre) {
    const sobreNuevo = { ...sobre };
    let cambio = false;
    if (sobre.titulo !== undefined && !esV5I18n(sobre.titulo)) {
      sobreNuevo.titulo = envolverString(sobre.titulo);
      cambio = true;
    }
    if (Array.isArray(sobre.puntos)) {
      const necesita = sobre.puntos.some((p) => typeof p === 'string');
      if (necesita) {
        sobreNuevo.puntos = envolverArrayStrings(sobre.puntos);
        cambio = true;
      }
    }
    if (cambio) patch.sobreNosotros = sobreNuevo;
  }

  const imagenes = doc.imagenes as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(imagenes)) {
    const necesita = imagenes.some((img) => typeof img.alt === 'string');
    if (necesita) {
      patch.imagenes = imagenes.map((img) => ({ ...img, alt: envolverString(img.alt) }));
    }
  }

  const imagenesSobre = doc.imagenesSobre as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(imagenesSobre)) {
    const necesita = imagenesSobre.some((img) => typeof img.alt === 'string');
    if (necesita) {
      patch.imagenesSobre = imagenesSobre.map((img) => ({
        ...img,
        alt: envolverString(img.alt),
      }));
    }
  }

  const servicios = doc.servicios as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(servicios)) {
    const necesita = servicios.some(
      (s) =>
        (s.nombre !== undefined && !esV5I18n(s.nombre)) ||
        (s.descripcion !== undefined && !esV5I18n(s.descripcion)),
    );
    if (necesita) {
      patch.servicios = servicios.map((s) => ({
        ...s,
        nombre: envolverString(s.nombre),
        descripcion: envolverString(s.descripcion),
      }));
    }
  }

  const faqs = doc.faqs as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(faqs)) {
    const necesita = faqs.some(
      (f) =>
        (f.pregunta !== undefined && !esV5I18n(f.pregunta)) ||
        (f.respuesta !== undefined && !esV5I18n(f.respuesta)),
    );
    if (necesita) {
      patch.faqs = faqs.map((f) => ({
        ...f,
        pregunta: envolverString(f.pregunta),
        respuesta: envolverString(f.respuesta),
      }));
    }
  }

  const seo = doc.seo as Record<string, unknown> | undefined;
  if (seo && seo.titulo !== undefined && !esV5I18n(seo.titulo)) {
    patch.seo = { ...seo, titulo: envolverString(seo.titulo) };
  }

  return patch;
}

async function main() {
  console.log(`Modo: ${APLICAR ? 'APLICAR (escribe)' : 'DRY-RUN (no escribe)'}\n`);

  console.log('— Paso 1: asegurar idiomas base —');
  await asegurarIdiomas();

  console.log('\n— Paso 2: migrar farmacias —');
  const docs = await client.fetch<Record<string, unknown>[]>(
    `*[_type == "farmacia"]`,
  );
  console.log(`Encontrados ${docs.length} documentos farmacia.`);

  let cambiados = 0;
  for (const doc of docs) {
    const patch = await migrarUnaFarmacia(doc);
    const campos = Object.keys(patch);
    if (campos.length === 0) {
      console.log(`✓ ${doc._id} ya migrado.`);
      continue;
    }
    cambiados++;
    console.log(`→ ${doc._id} migrar campos: ${campos.join(', ')}`);
    if (APLICAR) {
      await client.patch(doc._id as string).set(patch).commit();
      console.log(`  ✓ Guardado.`);
    }
  }

  console.log(
    `\nTotal farmacias: ${cambiados}/${docs.length} ${APLICAR ? 'migradas' : 'a migrar (dry-run)'}.`,
  );
  if (!APLICAR) {
    console.log('\nPara aplicar: APLICAR=1 pnpm exec sanity exec migrations/i18n-farmacia.ts --with-user-token');
  }
}

main().catch((err) => {
  console.error('Migración falló:', err);
  process.exit(1);
});
