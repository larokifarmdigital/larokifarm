import { defineType, defineField } from 'sanity';
import { validarTodosIdiomasOninguno } from '../lib/validacionI18nSync';

export const comunidad = defineType({
  name: 'comunidad',
  title: 'Comunidad',
  type: 'document',
  fields: [
    defineField({
      name: 'idiomasActivos',
      title: 'Idiomas activos en esta comunidad',
      type: 'array',
      description:
        'Idiomas en los que se publica ESTA comunidad. Escógelos del catálogo "🌐 Idiomas". ' +
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
      name: 'slug',
      title: 'Slug (URL)',
      type: 'slug',
      description:
        'Identificador único en la URL (ej. "andalucia"). Escríbelo manualmente; no se autogenera desde el nombre porque éste es multilingüe.',
      options: { maxLength: 60 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'tipo',
      title: 'Tipo',
      type: 'string',
      options: {
        list: [
          { title: 'Comunidad Autónoma', value: 'autonomica' },
          { title: 'Ciudad Autónoma', value: 'ciudad-autonoma' },
          { title: 'Calendario común estatal', value: 'comun-estatal' },
        ],
        layout: 'radio',
      },
      initialValue: 'autonomica',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'vigencia',
      title: 'Año de vigencia',
      type: 'string',
      description: 'Ej. "2026"',
    }),
    defineField({
      name: 'fuenteOficial',
      title: 'Fuente oficial (URL)',
      type: 'url',
      description: 'Enlace al BOE, diario autonómico o web del departamento de salud',
    }),
    defineField({
      name: 'notaCabecera',
      title: 'Nota de cabecera',
      type: 'internationalizedArrayText',
      description: 'Disclaimer o contexto opcional que aparece arriba de la página',
      validation: (r) => validarTodosIdiomasOninguno(r),
    }),
    defineField({
      name: 'gruposEdad',
      title: 'Grupos de edad',
      type: 'array',
      of: [{ type: 'grupoEdad' }],
      description: 'Ordena los grupos como deben aparecer en la página',
    }),
  ],
  orderings: [
    { title: 'Slug A-Z', name: 'slugAsc', by: [{ field: 'slug.current', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'nombre.0.value', subtitle: 'vigencia', tipo: 'tipo' },
    prepare({ title, subtitle, tipo }) {
      const tag =
        tipo === 'comun-estatal' ? '🇪🇸 Estatal' : tipo === 'ciudad-autonoma' ? '🏛️ Ciudad' : '🏛️ CA';
      return { title: title ?? '(sin nombre)', subtitle: `${tag} · ${subtitle ?? 'sin año'}` };
    },
  },
});
