import { defineType, defineField } from 'sanity';
import { validarTodosIdiomasOninguno } from '../lib/validacionI18nSync';

export const dosis = defineType({
  name: 'dosis',
  title: 'Dosis',
  type: 'document',
  fields: [
    defineField({
      name: 'idiomasActivos',
      title: 'Idiomas activos en esta dosis',
      type: 'array',
      description:
        'Idiomas en los que se publica ESTA dosis. Escógelos del catálogo "🌐 Idiomas". ' +
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
      name: 'etiqueta',
      title: 'Etiqueta',
      type: 'internationalizedArrayString',
      description: 'Ej. "1ª dosis", "Refuerzo", "Dosis única"',
      validation: (r) => validarTodosIdiomasOninguno(r),
    }),
    defineField({
      name: 'numero',
      title: 'Número de dosis',
      type: 'string',
      description: 'Ej. "1", "2", "R" (refuerzo). No se traduce.',
    }),
    defineField({
      name: 'edadAplicacion',
      title: 'Edad de aplicación',
      type: 'internationalizedArrayString',
      description: 'Ej. "2 meses", "6 años", "65 años y +"',
      validation: (r) => validarTodosIdiomasOninguno(r),
    }),
  ],
  preview: {
    select: { title: 'etiqueta.0.value', subtitle: 'edadAplicacion.0.value' },
    prepare({ title, subtitle }) {
      return { title: title ?? '(sin etiqueta)', subtitle: subtitle ?? '' };
    },
  },
});
