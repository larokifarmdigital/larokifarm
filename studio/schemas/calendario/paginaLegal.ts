import { defineType, defineField } from 'sanity';

export const paginaLegal = defineType({
  name: 'paginaLegal',
  title: 'Página legal',
  type: 'document',
  description:
    'Páginas legales del sitio standalone del calendario (aviso legal, política de privacidad). Una entrada por slug.',
  fields: [
    defineField({
      name: 'slug',
      title: 'Identificador',
      type: 'string',
      description:
        'Slug fijo que determina la URL. Solo puede haber un documento por slug.',
      options: {
        list: [
          { title: 'Aviso legal (/aviso-legal)', value: 'aviso-legal' },
          {
            title: 'Política de privacidad (/politica-privacidad)',
            value: 'politica-privacidad',
          },
        ],
        layout: 'radio',
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'titulo',
      title: 'Título de la página',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'actualizadoEl',
      title: 'Última actualización',
      type: 'date',
      description: 'Fecha visible al pie del título.',
      options: { dateFormat: 'YYYY-MM-DD' },
    }),
    defineField({
      name: 'contenido',
      title: 'Contenido',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'H2', value: 'h2' },
            { title: 'H3', value: 'h3' },
            { title: 'H4', value: 'h4' },
            { title: 'Cita', value: 'blockquote' },
          ],
          lists: [
            { title: 'Lista', value: 'bullet' },
            { title: 'Numerada', value: 'number' },
          ],
          marks: {
            decorators: [
              { title: 'Negrita', value: 'strong' },
              { title: 'Cursiva', value: 'em' },
              { title: 'Subrayado', value: 'underline' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Enlace',
                fields: [
                  {
                    name: 'href',
                    type: 'url',
                    title: 'URL',
                    validation: (r) => r.required(),
                  },
                  {
                    name: 'externo',
                    type: 'boolean',
                    title: '¿Abre en pestaña nueva?',
                    initialValue: false,
                  },
                ],
              },
            ],
          },
        },
      ],
      validation: (r) => r.required().min(1),
    }),
  ],
  preview: {
    select: { title: 'titulo', subtitle: 'slug' },
    prepare: ({ title, subtitle }) => ({
      title: title ?? '(sin título)',
      subtitle: subtitle ? `/${subtitle}` : '',
    }),
  },
});
