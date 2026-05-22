#!/usr/bin/env node
// Regenera seed/cima-initial.ndjson a partir de los catálogos del widget.
// Ejecutar con: node studio/seed/build-cima.mjs

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = resolve(__dirname, 'cima-initial.ndjson');

const ACTIVOS = [
  { slug: 'paracetamol',     nombre: 'Paracetamol',     atc: 'N02BE01' },
  { slug: 'ibuprofeno',      nombre: 'Ibuprofeno',      atc: 'M01AE01' },
  { slug: 'naproxeno',       nombre: 'Naproxeno',       atc: 'M01AE02' },
  { slug: 'diclofenaco',     nombre: 'Diclofenaco',     atc: 'M01AB05' },
  { slug: 'loratadina',      nombre: 'Loratadina',      atc: 'R06AX13' },
  { slug: 'cetirizina',      nombre: 'Cetirizina',      atc: 'R06AE07' },
  { slug: 'ebastina',        nombre: 'Ebastina',        atc: 'R06AX22' },
  { slug: 'bilastina',       nombre: 'Bilastina',       atc: 'R06AX29' },
  { slug: 'omeprazol',       nombre: 'Omeprazol',       atc: 'A02BC01' },
  { slug: 'almagato',        nombre: 'Almagato',        atc: 'A02AD04' },
  { slug: 'famotidina',      nombre: 'Famotidina',      atc: 'A02BA03' },
  { slug: 'ranitidina',      nombre: 'Ranitidina',      atc: 'A02BA02' },
  { slug: 'dextrometorfano', nombre: 'Dextrometorfano', atc: 'R05DA09' },
  { slug: 'ambroxol',        nombre: 'Ambroxol',        atc: 'R05CB06' },
  { slug: 'cloperastina',    nombre: 'Cloperastina',    atc: 'R05DB21' },
  { slug: 'guaifenesina',    nombre: 'Guaifenesina',    atc: 'R05CA03' },
  { slug: 'oximetazolina',   nombre: 'Oximetazolina',   atc: 'R01AA05' },
  { slug: 'xilometazolina',  nombre: 'Xilometazolina',  atc: 'R01AA07' },
  { slug: 'fenilefrina',     nombre: 'Fenilefrina',     atc: 'R01AA04' },
  { slug: 'suero',           nombre: 'Suero fisiológico' },
  { slug: 'dimetindeno',     nombre: 'Dimetindeno',     atc: 'D04AA13' },
  { slug: 'hidrocortisona',  nombre: 'Hidrocortisona',  atc: 'D07AA02' },
  { slug: 'aciclovir',       nombre: 'Aciclovir',       atc: 'D06BB03' },
  { slug: 'lactulosa',       nombre: 'Lactulosa',       atc: 'A06AD11' },
  { slug: 'macrogol',        nombre: 'Macrogol',        atc: 'A06AD15' },
  { slug: 'bisacodilo',      nombre: 'Bisacodilo',      atc: 'A06AB02' },
  { slug: 'loperamida',      nombre: 'Loperamida',      atc: 'A07DA03' },
  { slug: 'racecadotrilo',   nombre: 'Racecadotrilo',   atc: 'A07XA04' },
];

const SINTOMAS = [
  { id: 'fiebre',     label: 'Fiebre',           emoji: '🤒', orden: 10,  activos: ['paracetamol', 'ibuprofeno'] },
  { id: 'cabeza',     label: 'Dolor de cabeza',  emoji: '🤕', orden: 20,  activos: ['paracetamol', 'ibuprofeno', 'naproxeno'] },
  { id: 'muscular',   label: 'Dolor muscular',   emoji: '💪', orden: 30,  activos: ['ibuprofeno', 'diclofenaco', 'naproxeno', 'paracetamol'] },
  { id: 'congestion', label: 'Congestión nasal', emoji: '🤧', orden: 40,  activos: ['oximetazolina', 'xilometazolina', 'suero', 'fenilefrina'] },
  { id: 'tos',        label: 'Tos',              emoji: '😷', orden: 50,  activos: ['dextrometorfano', 'ambroxol', 'cloperastina', 'guaifenesina'] },
  { id: 'alergia',    label: 'Alergia',          emoji: '🌼', orden: 60,  activos: ['loratadina', 'cetirizina', 'ebastina', 'bilastina'] },
  { id: 'acidez',     label: 'Acidez / ardor',   emoji: '🔥', orden: 70,  activos: ['omeprazol', 'almagato', 'famotidina', 'ranitidina'] },
  { id: 'menstrual',  label: 'Dolor menstrual',  emoji: '🩸', orden: 80,  activos: ['ibuprofeno', 'naproxeno', 'paracetamol'] },
  { id: 'picaduras',  label: 'Picaduras',        emoji: '🦟', orden: 90,  activos: ['dimetindeno', 'hidrocortisona'] },
  { id: 'herpes',     label: 'Herpes labial',    emoji: '💋', orden: 100, activos: ['aciclovir'] },
  { id: 'estrenido',  label: 'Estreñimiento',    emoji: '🚽', orden: 110, activos: ['lactulosa', 'macrogol', 'bisacodilo'] },
  { id: 'gastro',     label: 'Diarrea',          emoji: '💧', orden: 120, activos: ['loperamida', 'racecadotrilo'] },
];

const PERFILES = [
  {
    id: 'bebe', label: 'Bebé (<2 años)', emoji: '👶', orden: 10,
    safe: ['paracetamol', 'ibuprofeno', 'suero'],
    warning: 'En menores de 6 meses consulta SIEMPRE al pediatra antes de administrar cualquier medicamento.',
  },
  {
    id: 'nino', label: 'Niño (2-11 años)', emoji: '🧒', orden: 20,
    safe: ['paracetamol', 'ibuprofeno', 'suero', 'loratadina', 'cetirizina', 'dextrometorfano', 'ambroxol'],
    warning: 'Las dosis pediátricas dependen del peso. Consulta el prospecto o pregunta al farmacéutico.',
  },
  {
    id: 'adolescente', label: 'Adolescente (12-17)', emoji: '🧑‍🎓', orden: 30,
    safe: ['paracetamol', 'ibuprofeno', 'naproxeno', 'loratadina', 'cetirizina', 'ebastina', 'bilastina', 'dextrometorfano', 'ambroxol', 'cloperastina', 'oximetazolina', 'xilometazolina', 'suero', 'omeprazol', 'almagato', 'famotidina', 'dimetindeno', 'aciclovir', 'loperamida', 'lactulosa', 'macrogol'],
    warning: 'Evita la aspirina (ácido acetilsalicílico) en menores de 16 años.',
  },
  {
    id: 'adulto', label: 'Adulto', emoji: '🧑', orden: 40,
    safe: ACTIVOS.map((a) => a.slug),
    warning: '',
  },
  {
    id: 'embarazada', label: 'Embarazada', emoji: '🤰', orden: 50,
    safe: ['paracetamol'],
    warning: 'Durante el embarazo solo se considera de uso generalmente seguro el paracetamol. Consulta SIEMPRE a tu médico o matrona antes de tomar nada.',
  },
  {
    id: 'lactancia', label: 'Lactancia', emoji: '🤱', orden: 60,
    safe: ['paracetamol', 'ibuprofeno'],
    warning: 'Durante la lactancia paracetamol e ibuprofeno son los de elección a corto plazo. Consulta a tu médico para tratamientos prolongados.',
  },
  {
    id: 'mayor', label: '+65 años', emoji: '👴', orden: 70,
    safe: ['paracetamol', 'loratadina', 'cetirizina', 'bilastina', 'omeprazol', 'famotidina', 'dextrometorfano', 'ambroxol', 'suero', 'oximetazolina', 'aciclovir', 'lactulosa', 'macrogol'],
    warning: 'En mayores de 65 años hay que tener especial cuidado con AINEs (ibuprofeno, naproxeno) por su impacto renal y digestivo. Consulta antes con tu médico.',
  },
];

const ref = (slug) => ({ _type: 'reference', _ref: `activo-${slug}` });

const docs = [];

ACTIVOS.forEach((a) => {
  docs.push({
    _id: `activo-${a.slug}`,
    _type: 'principioActivo',
    nombre: a.slug,
    nombreVisible: a.nombre,
    ...(a.atc ? { atc: a.atc } : {}),
  });
});

SINTOMAS.forEach((s) => {
  docs.push({
    _id: `sintoma-${s.id}`,
    _type: 'sintoma',
    id: s.id,
    label: s.label,
    emoji: s.emoji,
    orden: s.orden,
    activo: true,
    activos: s.activos.map((slug) => ({ _key: slug, ...ref(slug) })),
  });
});

PERFILES.forEach((p) => {
  docs.push({
    _id: `perfil-${p.id}`,
    _type: 'perfil',
    id: p.id,
    label: p.label,
    emoji: p.emoji,
    orden: p.orden,
    activo: true,
    safe: p.safe.map((slug) => ({ _key: slug, ...ref(slug) })),
    ...(p.warning ? { warning: p.warning } : {}),
  });
});

writeFileSync(out, docs.map((d) => JSON.stringify(d)).join('\n') + '\n', 'utf8');
console.log(`✓ generado ${out} con ${docs.length} documentos`);
console.log(`  ${ACTIVOS.length} principios activos, ${SINTOMAS.length} síntomas, ${PERFILES.length} perfiles`);
