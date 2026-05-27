import { defineType, defineField } from 'sanity';
import { validarTodosIdiomasOninguno } from '../lib/validacionI18nSync';

export const entrada = defineType({
  name: 'entrada',
  title: 'Entrada de calendario',
  type: 'object',
  fields: [
    defineField({
      name: 'vacuna',
      title: 'Vacuna',
      type: 'reference',
      to: [{ type: 'vacuna' }],
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'dosis',
      title: 'Dosis',
      type: 'reference',
      to: [{ type: 'dosis' }],
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'notaEspecifica',
      title: 'Nota específica',
      type: 'internationalizedArrayText',
      description: 'Opcional. Aclaración solo aplicable a esta vacuna en este grupo de edad.',
      validation: (r) => validarTodosIdiomasOninguno(r),
    }),
  ],
  preview: {
    select: {
      vacunaNombre: 'vacuna.nombreCorto',
      vacunaNombreLargo: 'vacuna.nombre.0.value',
      dosisEdad: 'dosis.edadAplicacion.0.value',
      dosisEtiqueta: 'dosis.etiqueta.0.value',
    },
    prepare({ vacunaNombre, vacunaNombreLargo, dosisEdad, dosisEtiqueta }) {
      return {
        title: vacunaNombre || vacunaNombreLargo || 'Sin vacuna',
        subtitle: [dosisEtiqueta, dosisEdad].filter(Boolean).join(' · ') || 'Sin dosis',
      };
    },
  },
});
