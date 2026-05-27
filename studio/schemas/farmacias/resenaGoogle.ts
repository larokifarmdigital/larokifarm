import { defineType, defineField } from 'sanity';

/**
 * Reseña sincronizada desde Google Business Profile.
 *
 * Estos documentos los crea/actualiza el Worker de Cloudflare en cron.
 * El editor solo toca `oculta` (para esconder reseñas inapropiadas) y
 * `destacada` (para promocionar algunas en el bloque de testimonios).
 *
 * El upsert se hace por `googleReviewId` (unique). Si Google borra la
 * reseña, el Worker la marca como `eliminadaEnGoogle: true` en lugar
 * de borrarla, para que el editor sepa por qué dejó de aparecer.
 */
export const resenaGoogle = defineType({
  name: 'resenaGoogle',
  title: 'Reseña Google',
  type: 'document',
  description:
    'Reseñas sincronizadas desde Google Business Profile. Editables solo en los campos de control editorial (oculta / destacada).',
  fields: [
    defineField({
      name: 'farmacia',
      title: 'Farmacia',
      type: 'reference',
      to: [{ type: 'farmacia' }],
      validation: (r) => r.required(),
      readOnly: true,
      description: 'A qué farmacia corresponde esta reseña. Lo asigna el Worker.',
    }),
    defineField({
      name: 'googleReviewId',
      title: 'ID de Google',
      type: 'string',
      validation: (r) => r.required(),
      readOnly: true,
      description: 'Identificador único de la reseña en Google. Usado para upsert.',
    }),
    defineField({
      name: 'autorNombre',
      title: 'Autor',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'autorFotoUrl',
      title: 'Foto de perfil del autor (URL)',
      type: 'url',
      readOnly: true,
    }),
    defineField({
      name: 'rating',
      title: 'Estrellas',
      type: 'number',
      validation: (r) => r.required().integer().min(1).max(5),
      readOnly: true,
    }),
    defineField({
      name: 'comentario',
      title: 'Comentario',
      type: 'text',
      rows: 4,
      readOnly: true,
      description: 'Texto de la reseña en su idioma original. Puede estar vacío si el cliente solo puso estrellas.',
    }),
    defineField({
      name: 'comentarioIdioma',
      title: 'Idioma del comentario',
      type: 'string',
      readOnly: true,
      description: 'Código BCP-47 detectado por Google (ej: "es", "en", "ca").',
    }),
    defineField({
      name: 'respuestaOwner',
      title: 'Respuesta del propietario',
      type: 'text',
      rows: 3,
      readOnly: true,
      description: 'Si la farmacia ya respondió desde Google, aparece aquí. No se edita desde Sanity.',
    }),
    defineField({
      name: 'respuestaOwnerFecha',
      title: 'Fecha de respuesta',
      type: 'datetime',
      readOnly: true,
    }),
    defineField({
      name: 'fechaPublicacion',
      title: 'Publicada el',
      type: 'datetime',
      validation: (r) => r.required(),
      readOnly: true,
    }),
    defineField({
      name: 'fechaActualizacion',
      title: 'Última actualización en Google',
      type: 'datetime',
      readOnly: true,
    }),
    defineField({
      name: 'fechaSincronizacion',
      title: 'Última sincronización',
      type: 'datetime',
      readOnly: true,
      description: 'Cuándo trajimos esta versión de la reseña desde Google.',
    }),
    defineField({
      name: 'eliminadaEnGoogle',
      title: '¿Eliminada en Google?',
      type: 'boolean',
      initialValue: false,
      readOnly: true,
      description:
        'Si el Worker detectó que esta reseña ya no aparece en Google, la marca aquí en lugar de borrarla, por trazabilidad.',
    }),
    // ── Controles editoriales (los únicos editables) ──────────────────
    defineField({
      name: 'oculta',
      title: 'Ocultar de la web',
      type: 'boolean',
      initialValue: false,
      description:
        'Marca para no mostrar esta reseña en el sitio público (sin tener que borrarla en Google).',
    }),
    defineField({
      name: 'destacada',
      title: 'Destacar en testimonios',
      type: 'boolean',
      initialValue: false,
      description:
        'Promociona esta reseña al bloque principal de testimonios de la landing.',
    }),
  ],
  orderings: [
    {
      title: 'Más recientes primero',
      name: 'fechaDesc',
      by: [{ field: 'fechaPublicacion', direction: 'desc' }],
    },
    {
      title: 'Mejor puntuadas primero',
      name: 'ratingDesc',
      by: [
        { field: 'rating', direction: 'desc' },
        { field: 'fechaPublicacion', direction: 'desc' },
      ],
    },
  ],
  preview: {
    select: {
      autor: 'autorNombre',
      rating: 'rating',
      comentario: 'comentario',
      fecha: 'fechaPublicacion',
      oculta: 'oculta',
      destacada: 'destacada',
      eliminada: 'eliminadaEnGoogle',
    },
    prepare({ autor, rating, comentario, fecha, oculta, destacada, eliminada }) {
      const estrellas = '★'.repeat(rating ?? 0) + '☆'.repeat(5 - (rating ?? 0));
      const flags = [
        eliminada && '🗑️ eliminada',
        oculta && '🙈 oculta',
        destacada && '⭐ destacada',
      ]
        .filter(Boolean)
        .join(' · ');
      const dia = fecha ? new Date(fecha).toLocaleDateString('es-ES') : 'sin fecha';
      return {
        title: `${estrellas}  ${autor ?? 'Anónimo'}`,
        subtitle: [dia, flags, comentario?.slice(0, 60)].filter(Boolean).join(' · '),
      };
    },
  },
});
