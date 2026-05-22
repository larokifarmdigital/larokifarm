import { defineType, defineField } from 'sanity';

export const principioActivo = defineType({
  name: 'principioActivo',
  title: 'Principio activo',
  type: 'document',
  fields: [
    defineField({
      name: 'nombre',
      title: 'Nombre interno (slug, sin tildes, en minúsculas)',
      description: 'Se usa para buscar en CIMA. Ej: "paracetamol", "ibuprofeno", "loratadina".',
      type: 'string',
      validation: (r) => r.required().regex(/^[a-z0-9-]+$/, { name: 'minúsculas, números, guiones' }),
    }),
    defineField({
      name: 'nombreVisible',
      title: 'Nombre visible',
      description: 'Cómo se muestra al farmacéutico en este panel. Ej: "Paracetamol".',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'atc',
      title: 'Código ATC (opcional)',
      description: 'Clasificación ATC nivel 5 si la conoces. Ej: N02BE01 (paracetamol).',
      type: 'string',
    }),
    defineField({
      name: 'nota',
      title: 'Nota interna (opcional)',
      type: 'text',
      rows: 2,
    }),
  ],
  preview: {
    select: { title: 'nombreVisible', subtitle: 'nombre' },
  },
  orderings: [
    { title: 'Nombre A→Z', name: 'nombreAsc', by: [{ field: 'nombreVisible', direction: 'asc' }] },
  ],
});
