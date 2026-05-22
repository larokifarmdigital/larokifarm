import { defineType, defineField } from 'sanity';

export const dosis = defineType({
  name: 'dosis',
  title: 'Dosis',
  type: 'document',
  fields: [
    defineField({
      name: 'etiqueta',
      title: 'Etiqueta',
      type: 'string',
      description: 'Ej. "1ª dosis", "Refuerzo", "Dosis única"',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'numero',
      title: 'Número de dosis',
      type: 'string',
      description: 'Ej. "1", "2", "R" (refuerzo). Texto para permitir "R", "Booster", etc.',
    }),
    defineField({
      name: 'edadAplicacion',
      title: 'Edad de aplicación',
      type: 'string',
      description: 'Ej. "2 meses", "6 años", "65 años y +"',
      validation: (r) => r.required(),
    }),
  ],
  preview: {
    select: { title: 'etiqueta', subtitle: 'edadAplicacion' },
  },
});
