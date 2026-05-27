import { defineType, defineField } from 'sanity';
import { validarTodosIdiomasOninguno } from '../lib/validacionI18nSync';

export const vacuna = defineType({
  name: 'vacuna',
  title: 'Vacuna',
  type: 'document',
  fields: [
    defineField({
      name: 'idiomasActivos',
      title: 'Idiomas activos en esta vacuna',
      type: 'array',
      description:
        'Idiomas en los que se publica ESTA vacuna. Escógelos del catálogo "🌐 Idiomas". ' +
        'En cada campo traducible, la validación obliga a rellenar todos los idiomas listados aquí (o dejar el campo vacío en todos).',
      of: [
        {
          type: 'reference',
          to: [{ type: 'idioma' }],
          options: { disableNew: false },
        },
      ],
      validation: (r) =>
        r
          .required()
          .min(1)
          .custom((items) => {
            if (!Array.isArray(items)) return true;
            const refs = (items as { _ref?: string }[])
              .map((i) => i._ref)
              .filter(Boolean) as string[];
            const dup = refs.filter((c, idx) => refs.indexOf(c) !== idx);
            if (dup.length > 0) return 'No repitas el mismo idioma dos veces.';
            return true;
          }),
    }),
    defineField({
      name: 'nombre',
      title: 'Nombre completo',
      type: 'internationalizedArrayString',
      description: 'Ej. "Hexavalente"',
      validation: (r) => validarTodosIdiomasOninguno(r),
    }),
    defineField({
      name: 'nombreCorto',
      title: 'Nombre corto / siglas',
      type: 'string',
      description: 'Ej. "DTPa-VPI-Hib-HB". Las siglas no se traducen.',
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
      type: 'internationalizedArrayText',
      description: 'Información que aplica a esta vacuna en cualquier comunidad',
      validation: (r) => validarTodosIdiomasOninguno(r),
    }),
  ],
  preview: {
    select: { title: 'nombre.0.value', subtitle: 'nombreCorto' },
    prepare({ title, subtitle }) {
      return { title: title ?? '(sin nombre)', subtitle: subtitle ?? '' };
    },
  },
});
