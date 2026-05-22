import { defineType, defineField } from 'sanity';

export const idioma = defineType({
  name: 'idioma',
  title: 'Idioma',
  type: 'document',
  description:
    'Idioma disponible. Cada farmacia escoge desde su campo "idiomasActivos" cuáles usa.',
  fields: [
    defineField({
      name: 'codigo',
      title: 'Código (ISO 639-1)',
      type: 'string',
      description:
        'Dos letras minúsculas: es, en, ca, pt, fr… Si necesitas una variante regional (es-mx, en-us), usa el formato XX-XX.',
      validation: (r) =>
        r
          .required()
          .lowercase()
          .min(2)
          .max(5)
          .regex(/^[a-z]{2}(-[a-z]{2})?$/i, { name: 'codigo-iso' }),
    }),
    defineField({
      name: 'nombre',
      title: 'Nombre del idioma',
      type: 'string',
      description: 'Cómo aparece en el Studio. Ej.: "Español", "English", "Català", "Português".',
      validation: (r) => r.required().min(2).max(40),
    }),
  ],
  preview: {
    select: { title: 'nombre', subtitle: 'codigo' },
    prepare({ title, subtitle }) {
      return {
        title: title ?? '—',
        subtitle: subtitle ? subtitle.toUpperCase() : '?',
      };
    },
  },
});
