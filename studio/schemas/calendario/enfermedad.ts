import { defineType, defineField } from 'sanity';

export const enfermedad = defineType({
  name: 'enfermedad',
  title: 'Enfermedad',
  type: 'document',
  fields: [
    defineField({
      name: 'nombre',
      title: 'Nombre',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'descripcion',
      title: 'Descripción',
      type: 'text',
      rows: 3,
    }),
  ],
  preview: {
    select: { title: 'nombre' },
  },
});
