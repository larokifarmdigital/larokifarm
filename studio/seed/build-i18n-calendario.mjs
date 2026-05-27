#!/usr/bin/env node
/**
 * Convierte los seeds NDJSON del calendario al formato i18n
 * (sanity-plugin-internationalized-array v5) y añade los documentos
 * `idioma-es`, `idioma-en`, `idioma-ca` al seed estatal.
 *
 * Lee:
 *   - comun-estatal-2026.ndjson  (legado plano, opcional)
 *   - cataluna-2026.ndjson       (legado plano, opcional)
 *   - esqueletos-ccaa.ndjson     (legado plano, opcional)
 *
 * Escribe in-place el formato i18n. Idempotente: si un campo ya está
 * en formato v5 lo deja como está.
 *
 * Ejecutar:  node studio/seed/build-i18n-calendario.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

const IDIOMAS_ACTIVOS_ES = [
  { _key: 'lang-es', _type: 'reference', _ref: 'idioma-es' },
];

const IDIOMAS_DOCS = [
  { _id: 'idioma-es', _type: 'idioma', codigo: 'es', nombre: 'Español' },
  { _id: 'idioma-en', _type: 'idioma', codigo: 'en', nombre: 'English' },
  { _id: 'idioma-ca', _type: 'idioma', codigo: 'ca', nombre: 'Català' },
];

function keyDet(...partes) {
  return createHash('sha1').update(partes.join('|')).digest('hex').slice(0, 12);
}

function esV5(valor) {
  return (
    Array.isArray(valor) &&
    valor.length > 0 &&
    valor.every(
      (e) => e && typeof e === 'object' && 'language' in e && 'value' in e,
    )
  );
}

function envolverI18n(valor, ctx) {
  if (valor === undefined || valor === null) return valor;
  if (esV5(valor)) return valor;
  if (typeof valor !== 'string') return valor;
  return [{ _key: keyDet(ctx, 'es'), language: 'es', value: valor }];
}

const CAMPOS_POR_TIPO = {
  comunidad: ['nombre', 'notaCabecera'],
  vacuna: ['nombre', 'notaGeneral'],
  dosis: ['etiqueta', 'edadAplicacion'],
  enfermedad: ['nombre', 'descripcion'],
};

function migrarDoc(doc) {
  const tipo = doc._type;
  const campos = CAMPOS_POR_TIPO[tipo];
  if (!campos) return doc;

  const nuevo = { ...doc };

  if (!Array.isArray(nuevo.idiomasActivos) || nuevo.idiomasActivos.length === 0) {
    nuevo.idiomasActivos = IDIOMAS_ACTIVOS_ES;
  }

  for (const campo of campos) {
    if (nuevo[campo] !== undefined) {
      nuevo[campo] = envolverI18n(nuevo[campo], `${doc._id}.${campo}`);
    }
  }

  if (tipo === 'comunidad' && Array.isArray(nuevo.gruposEdad)) {
    nuevo.gruposEdad = nuevo.gruposEdad.map((g) => {
      const grupoNuevo = { ...g };
      if (g.descripcion !== undefined) {
        grupoNuevo.descripcion = envolverI18n(
          g.descripcion,
          `${doc._id}.${g._key}.descripcion`,
        );
      }
      if (Array.isArray(g.entradas)) {
        grupoNuevo.entradas = g.entradas.map((e) => {
          if (e.notaEspecifica === undefined) return e;
          return {
            ...e,
            notaEspecifica: envolverI18n(
              e.notaEspecifica,
              `${doc._id}.${g._key}.${e._key}.notaEspecifica`,
            ),
          };
        });
      }
      return grupoNuevo;
    });
  }

  return nuevo;
}

function migrarArchivo(nombre, { prependIdiomas = false } = {}) {
  const ruta = resolve(__dirname, nombre);
  if (!existsSync(ruta)) {
    console.warn(`  ⚠️  No existe ${nombre}, salto.`);
    return;
  }
  const contenido = readFileSync(ruta, 'utf8');
  const lineas = contenido.split('\n').filter((l) => l.trim().length > 0);
  const docs = lineas.map((l) => JSON.parse(l));

  // Quita docs idioma-* preexistentes si los había, para evitar duplicados.
  const limpios = docs.filter((d) => !(d._type === 'idioma' && d._id?.startsWith('idioma-')));
  const migrados = limpios.map(migrarDoc);

  const salida = prependIdiomas ? [...IDIOMAS_DOCS, ...migrados] : migrados;
  writeFileSync(ruta, salida.map((d) => JSON.stringify(d)).join('\n') + '\n', 'utf8');
  console.log(
    `  ✓ ${nombre}: ${migrados.length} doc${migrados.length === 1 ? '' : 's'}` +
      (prependIdiomas ? ` (+ ${IDIOMAS_DOCS.length} idiomas)` : ''),
  );
}

console.log('— Convirtiendo seeds del calendario a formato i18n —\n');
migrarArchivo('comun-estatal-2026.ndjson', { prependIdiomas: true });
migrarArchivo('cataluna-2026.ndjson');
migrarArchivo('esqueletos-ccaa.ndjson');
console.log('\n✓ Hecho.');
