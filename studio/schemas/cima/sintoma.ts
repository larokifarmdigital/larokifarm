import { defineType, defineField } from 'sanity';

export const sintoma = defineType({
  name: 'sintoma',
  title: 'Síntoma',
  type: 'document',
  fields: [
    defineField({
      name: 'id',
      title: 'ID interno (slug)',
      description: 'Identificador único, en minúsculas y sin espacios. Ej: "fiebre", "dolor-cabeza".',
      type: 'string',
      validation: (r) => r.required().regex(/^[a-z0-9-]+$/, { name: 'minúsculas, números, guiones' }),
    }),
    defineField({
      name: 'label',
      title: 'Etiqueta visible',
      description: 'Cómo lo verá el usuario en el chat. Ej: "Fiebre", "Dolor de cabeza".',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'emoji',
      title: 'Emoji',
      description: 'Un solo emoji que represente el síntoma. Ej: 🤒',
      type: 'string',
      validation: (r) => r.required().max(4),
    }),
    defineField({
      name: 'orden',
      title: 'Orden',
      description: 'Número para ordenar los chips (menor = primero).',
      type: 'number',
      initialValue: 100,
      validation: (r) => r.required().integer(),
    }),
    defineField({
      name: 'activo',
      title: 'Activo',
      description: 'Desmarca para ocultar este síntoma sin borrarlo.',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'activos',
      title: 'Principios activos apropiados',
      description: 'Los principios activos que sugerimos para este síntoma. El widget cruzará esta lista con la del perfil del usuario.',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'principioActivo' }] }],
      validation: (r) => r.required().min(1).unique(),
    }),
    defineField({
      name: 'nota',
      title: 'Nota para el usuario (opcional)',
      description: 'Si la rellenas, aparece junto a los resultados. Ej: "Si la fiebre dura más de 3 días, acude al médico".',
      type: 'text',
      rows: 2,
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
    { title: 'A→Z', name: 'labelAsc', by: [{ field: 'label', direction: 'asc' }] },
  ],
});
