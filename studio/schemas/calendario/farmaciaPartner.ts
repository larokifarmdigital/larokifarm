import { defineType, defineField } from 'sanity';

export const farmaciaPartner = defineType({
  name: 'farmaciaPartner',
  title: 'Farmacia partner (footer del hub)',
  type: 'document',
  description:
    'Selecciona una farmacia ya registrada para listarla en el footer del sitio standalone del calendario. Los datos (nombre, logo, ciudad, web) se sincronizan automáticamente desde la ficha de la farmacia.',
  fields: [
    defineField({
      name: 'farmacia',
      title: 'Farmacia',
      type: 'reference',
      to: [{ type: 'farmacia' }],
      description:
        'Elige una farmacia del catálogo. Asegúrate de que tenga logo, ciudad y contacto.web rellenos para que aparezca completa en el footer.',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'orden',
      title: 'Orden de aparición',
      type: 'number',
      description: 'Menor = aparece antes en el footer.',
      initialValue: 0,
    }),
  ],
  preview: {
    select: {
      title: 'farmacia.nombre',
      subtitle: 'farmacia.direccion.ciudad',
      media: 'farmacia.logo',
    },
    prepare({ title, subtitle, media }) {
      return {
        title: title ?? '(farmacia sin nombre)',
        subtitle: subtitle ?? '—',
        media,
      };
    },
  },
  orderings: [
    {
      title: 'Orden manual',
      name: 'ordenAsc',
      by: [{ field: 'orden', direction: 'asc' }],
    },
    {
      title: 'Nombre de la farmacia',
      name: 'nombreAsc',
      by: [{ field: 'farmacia.nombre', direction: 'asc' }],
    },
  ],
});
