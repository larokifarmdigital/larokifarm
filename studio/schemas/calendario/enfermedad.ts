import { defineType, defineField } from 'sanity';
import { validarTodosIdiomasOninguno } from '../lib/validacionI18nSync';

export const enfermedad = defineType({
  name: 'enfermedad',
  title: 'Enfermedad',
  type: 'document',
  fields: [
    defineField({
      name: 'idiomasActivos',
      title: 'Idiomas activos en esta enfermedad',
      type: 'array',
      description:
        'Idiomas en los que se publica ESTA enfermedad. Escógelos del catálogo "🌐 Idiomas". ' +
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
      title: 'Nombre',
      type: 'internationalizedArrayString',
      validation: (r) => validarTodosIdiomasOninguno(r),
    }),
    defineField({
      name: 'descripcion',
      title: 'Descripción',
      type: 'internationalizedArrayText',
      validation: (r) => validarTodosIdiomasOninguno(r),
    }),
  ],
  preview: {
    select: { title: 'nombre.0.value' },
    prepare({ title }) {
      return { title: title ?? '(sin nombre)' };
    },
  },
});
