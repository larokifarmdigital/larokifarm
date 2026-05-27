import { defineType, defineField } from 'sanity';
import { validarTodosIdiomasOninguno } from '../lib/validacionI18nSync';

export const grupoEdad = defineType({
  name: 'grupoEdad',
  title: 'Grupo de edad',
  type: 'object',
  fields: [
    defineField({
      name: 'nombre',
      title: 'Grupo',
      type: 'string',
      options: {
        list: [
          { title: 'Lactantes', value: 'lactantes' },
          { title: 'Infancia', value: 'infancia' },
          { title: 'Adolescencia', value: 'adolescencia' },
          { title: 'Adultos', value: 'adultos' },
          { title: 'Embarazadas', value: 'embarazadas' },
          { title: 'Mayores (65+)', value: 'mayores' },
        ],
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'descripcion',
      title: 'Descripción del rango',
      type: 'internationalizedArrayString',
      description: 'Ej. "0-15 meses", "6-14 años", "65 años y más"',
      validation: (r) => validarTodosIdiomasOninguno(r),
    }),
    defineField({
      name: 'entradas',
      title: 'Vacunas en este grupo',
      type: 'array',
      of: [{ type: 'entrada' }],
    }),
  ],
  preview: {
    select: { nombre: 'nombre', descripcion: 'descripcion.0.value', entradas: 'entradas' },
    prepare({ nombre, descripcion, entradas }) {
      const count = Array.isArray(entradas) ? entradas.length : 0;
      return {
        title: nombre ? nombre[0].toUpperCase() + nombre.slice(1) : 'Grupo sin nombre',
        subtitle: `${descripcion ?? ''} · ${count} entrada${count === 1 ? '' : 's'}`,
      };
    },
  },
});
