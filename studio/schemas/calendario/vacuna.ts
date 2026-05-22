import { defineType, defineField } from 'sanity';

export const vacuna = defineType({
  name: 'vacuna',
  title: 'Vacuna',
  type: 'document',
  fields: [
    defineField({
      name: 'nombre',
      title: 'Nombre completo',
      type: 'string',
      description: 'Ej. "Hexavalente"',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'nombreCorto',
      title: 'Nombre corto / siglas',
      type: 'string',
      description: 'Ej. "DTPa-VPI-Hib-HB"',
    }),
    defineField({
      name: 'enfermedadesPrevenidas',
      title: 'Enfermedades que previene',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'enfermedad' }] }],
    }),
    defineField({
      name: 'via',
      title: 'Vía de administración',
      type: 'string',
      options: {
        list: [
          { title: 'Intramuscular', value: 'intramuscular' },
          { title: 'Subcutánea', value: 'subcutanea' },
          { title: 'Oral', value: 'oral' },
          { title: 'Intranasal', value: 'intranasal' },
        ],
      },
    }),
    defineField({
      name: 'notaGeneral',
      title: 'Nota general',
      type: 'text',
      rows: 3,
      description: 'Información que aplica a esta vacuna en cualquier comunidad',
    }),
  ],
  preview: {
    select: { title: 'nombre', subtitle: 'nombreCorto' },
  },
});
