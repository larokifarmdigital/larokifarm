import { defineType, defineField } from 'sanity';

export const farmaciaPartner = defineType({
  name: 'farmaciaPartner',
  title: 'Farmacia partner (footer del hub)',
  type: 'document',
  description:
    'Farmacias que ofrecen el servicio del calendario y aparecen en el footer del sitio standalone.',
  fields: [
    defineField({
      name: 'nombre',
      title: 'Nombre',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'url',
      title: 'URL de la landing',
      type: 'url',
      description: 'URL completa con https://',
      validation: (r) =>
        r.required().uri({ scheme: ['http', 'https'], allowRelative: false }),
    }),
    defineField({
      name: 'ciudad',
      title: 'Ciudad',
      type: 'string',
    }),
    defineField({
      name: 'orden',
      title: 'Orden de aparición',
      type: 'number',
      description: 'Menor = aparece antes en el footer.',
      initialValue: 0,
    }),
  ],
  preview: {
    select: { title: 'nombre', subtitle: 'ciudad', media: 'logo' },
  },
  orderings: [
    {
      title: 'Orden manual',
      name: 'ordenAsc',
      by: [{ field: 'orden', direction: 'asc' }],
    },
    {
      title: 'Nombre',
      name: 'nombreAsc',
      by: [{ field: 'nombre', direction: 'asc' }],
    },
  ],
});
