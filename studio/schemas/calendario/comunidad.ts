import { defineType, defineField } from 'sanity';

export const comunidad = defineType({
  name: 'comunidad',
  title: 'Comunidad',
  type: 'document',
  fields: [
    defineField({
      name: 'nombre',
      title: 'Nombre',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug (URL)',
      type: 'slug',
      options: { source: 'nombre', maxLength: 60 },
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
      type: 'text',
      rows: 3,
      description: 'Disclaimer o contexto opcional que aparece arriba de la página',
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
    { title: 'Nombre A-Z', name: 'nombreAsc', by: [{ field: 'nombre', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'nombre', subtitle: 'vigencia', tipo: 'tipo' },
    prepare({ title, subtitle, tipo }) {
      const tag =
        tipo === 'comun-estatal' ? '🇪🇸 Estatal' : tipo === 'ciudad-autonoma' ? '🏛️ Ciudad' : '🏛️ CA';
      return { title, subtitle: `${tag} · ${subtitle ?? 'sin año'}` };
    },
  },
});
