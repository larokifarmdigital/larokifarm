import { defineType, defineField } from 'sanity';

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
      type: 'text',
      rows: 2,
      description: 'Opcional. Aclaración solo aplicable a esta vacuna en este grupo de edad.',
    }),
  ],
  preview: {
    select: {
      vacunaNombre: 'vacuna.nombreCorto',
      vacunaNombreLargo: 'vacuna.nombre',
      dosisEdad: 'dosis.edadAplicacion',
      dosisEtiqueta: 'dosis.etiqueta',
    },
    prepare({ vacunaNombre, vacunaNombreLargo, dosisEdad, dosisEtiqueta }) {
      return {
        title: vacunaNombre || vacunaNombreLargo || 'Sin vacuna',
        subtitle: [dosisEtiqueta, dosisEdad].filter(Boolean).join(' · ') || 'Sin dosis',
      };
    },
  },
});
