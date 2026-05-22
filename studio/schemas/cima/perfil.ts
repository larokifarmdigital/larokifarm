import { defineType, defineField } from 'sanity';

export const perfil = defineType({
  name: 'perfil',
  title: 'Perfil de usuario',
  type: 'document',
  fields: [
    defineField({
      name: 'id',
      title: 'ID interno (slug)',
      description: 'Identificador único. Ej: "bebe", "embarazada", "mayor".',
      type: 'string',
      validation: (r) => r.required().regex(/^[a-z0-9-]+$/),
    }),
    defineField({
      name: 'label',
      title: 'Etiqueta visible',
      description: 'Ej: "Bebé (<2 años)", "Embarazada".',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'emoji',
      title: 'Emoji',
      type: 'string',
      validation: (r) => r.required().max(4),
    }),
    defineField({
      name: 'orden',
      title: 'Orden',
      type: 'number',
      initialValue: 100,
      validation: (r) => r.required().integer(),
    }),
    defineField({
      name: 'activo',
      title: 'Activo',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'safe',
      title: 'Principios activos OTC apropiados',
      description: 'Lista de principios activos que el widget puede sugerir para este perfil. Solo sale uno si está en este whitelist Y en la lista del síntoma.',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'principioActivo' }] }],
      validation: (r) => r.unique(),
    }),
    defineField({
      name: 'warning',
      title: 'Advertencia mostrada al usuario',
      description: 'Aviso que se muestra siempre en la respuesta para este perfil. Ej: "Cuidado con AINEs en mayores de 65".',
      type: 'text',
      rows: 3,
    }),
  ],
  preview: {
    select: { title: 'label', subtitle: 'id', emoji: 'emoji' },
    prepare: ({ title, subtitle, emoji }) => ({
      title: `${emoji ?? ''} ${title}`,
      subtitle,
    }),
  },
  orderings: [
    { title: 'Por orden', name: 'ordenAsc', by: [{ field: 'orden', direction: 'asc' }] },
  ],
});
