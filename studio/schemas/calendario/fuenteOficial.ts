import { defineType, defineField } from 'sanity';

export const fuenteOficial = defineType({
  name: 'fuenteOficial',
  title: 'Fuente oficial',
  type: 'document',
  description:
    'Enlaces a fuentes oficiales (Ministerio de Sanidad, Consejerías de cada CCAA, organismos internacionales) usados para construir los calendarios. Aparecen en /fuentes.',
  fields: [
    defineField({
      name: 'nombre',
      title: 'Nombre',
      type: 'string',
      description:
        'Nombre del organismo o documento. Ej.: "Ministerio de Sanidad — CISNS" o "Consejería de Salud de Andalucía".',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'url',
      title: 'URL oficial',
      type: 'url',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'descripcion',
      title: 'Descripción breve',
      type: 'text',
      rows: 2,
      description: 'Una línea explicando qué se publica en esa fuente.',
    }),
    defineField({
      name: 'categoria',
      title: 'Categoría',
      type: 'string',
      options: {
        list: [
          { title: 'Estatal', value: 'estatal' },
          { title: 'Autonómica', value: 'autonomica' },
          { title: 'Internacional', value: 'internacional' },
          { title: 'Sociedad científica', value: 'sociedad' },
        ],
        layout: 'radio',
      },
      initialValue: 'autonomica',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'comunidad',
      title: 'Comunidad asociada (opcional)',
      type: 'reference',
      to: [{ type: 'comunidad' }],
      description:
        'Si es una fuente autonómica, asóciala a su comunidad para que aparezca junto al calendario correspondiente.',
      hidden: ({ document }) => document?.categoria !== 'autonomica',
    }),
    defineField({
      name: 'orden',
      title: 'Orden dentro de su categoría',
      type: 'number',
      description: 'Menor = aparece antes.',
      initialValue: 0,
    }),
  ],
  preview: {
    select: { title: 'nombre', subtitle: 'categoria', url: 'url' },
    prepare: ({ title, subtitle, url }) => ({
      title: title ?? '(sin nombre)',
      subtitle: [subtitle, url].filter(Boolean).join(' · '),
    }),
  },
  orderings: [
    {
      title: 'Categoría y orden',
      name: 'categoriaOrden',
      by: [
        { field: 'categoria', direction: 'asc' },
        { field: 'orden', direction: 'asc' },
        { field: 'nombre', direction: 'asc' },
      ],
    },
  ],
});
