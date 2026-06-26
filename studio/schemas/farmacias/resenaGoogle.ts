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
    'Reseñas sincronizadas desde Google Business Profile. Los datos provenientes de Google se sobrescriben en cada sync; sólo puedes editar los controles editoriales (ocultar / destacar).',
  fieldsets: [
    {
      name: 'sincronizado',
      title: '🔒 Datos sincronizados desde Google',
      description:
        'Estos campos los rellena automáticamente el Worker en cada sync (cada ~12 h). Cualquier cambio que hagas aquí se perderá en el próximo cron — son sólo para consulta.',
      options: { collapsible: true, collapsed: false },
    },
    {
      name: 'editorial',
      title: '✏️ Control editorial (lo único editable)',
      description:
        'Estos dos campos son los únicos que SÍ persisten — el sync respeta lo que marques aquí.',
      options: { collapsible: false },
    },
  ],
  fields: [
    // ── Datos sincronizados desde Google (read-only) ─────────────────
    defineField({
      name: 'farmacia',
      title: 'Farmacia',
      type: 'reference',
      to: [{ type: 'farmacia' }],
      validation: (r) => r.required(),
      readOnly: true,
      fieldset: 'sincronizado',
      description:
        '🔒 Auto · Asignado por el Worker según el `googleLocationName` del doc Farmacia.',
    }),
    defineField({
      name: 'googleReviewId',
      title: 'ID de Google',
      type: 'string',
      validation: (r) => r.required(),
      readOnly: true,
      fieldset: 'sincronizado',
      description: '🔒 Auto · Identificador único en Google. Usado para upsert.',
    }),
    defineField({
      name: 'autorNombre',
      title: 'Autor',
      type: 'string',
      readOnly: true,
      fieldset: 'sincronizado',
      description: '🔒 Auto · Nombre tal como aparece en Google.',
    }),
    defineField({
      name: 'autorFotoUrl',
      title: 'Foto de perfil del autor (URL)',
      type: 'url',
      readOnly: true,
      fieldset: 'sincronizado',
      description: '🔒 Auto · URL de la foto de perfil del autor en Google.',
    }),
    defineField({
      name: 'rating',
      title: 'Estrellas',
      type: 'number',
      validation: (r) => r.required().integer().min(1).max(5),
      readOnly: true,
      fieldset: 'sincronizado',
      description: '🔒 Auto · Puntuación que el cliente dio en Google (1-5).',
    }),
    defineField({
      name: 'comentario',
      title: 'Comentario',
      type: 'text',
      rows: 4,
      readOnly: true,
      fieldset: 'sincronizado',
      description:
        '🔒 Auto · Texto en su idioma original. Puede estar vacío si el cliente solo puso estrellas.',
    }),
    defineField({
      name: 'comentarioIdioma',
      title: 'Idioma del comentario',
      type: 'string',
      readOnly: true,
      fieldset: 'sincronizado',
      description: '🔒 Auto · Código BCP-47 detectado por Google (ej: "es", "en", "ca").',
    }),
    defineField({
      name: 'respuestaOwner',
      title: 'Respuesta del propietario',
      type: 'text',
      rows: 3,
      readOnly: true,
      fieldset: 'sincronizado',
      description:
        '🔒 Auto · Si respondiste a esta reseña desde Google Business Profile, aparece aquí. Para responder, hazlo desde tu app de Google Business — el sync lo traerá.',
    }),
    defineField({
      name: 'respuestaOwnerFecha',
      title: 'Fecha de respuesta',
      type: 'datetime',
      readOnly: true,
      fieldset: 'sincronizado',
      description: '🔒 Auto · Cuándo se publicó la respuesta del propietario en Google.',
    }),
    defineField({
      name: 'fechaPublicacion',
      title: 'Publicada el',
      type: 'datetime',
      validation: (r) => r.required(),
      readOnly: true,
      fieldset: 'sincronizado',
      description: '🔒 Auto · Cuándo el cliente publicó la reseña en Google.',
    }),
    defineField({
      name: 'fechaActualizacion',
      title: 'Última actualización en Google',
      type: 'datetime',
      readOnly: true,
      fieldset: 'sincronizado',
      description: '🔒 Auto · Cuándo el cliente editó por última vez su reseña en Google.',
    }),
    defineField({
      name: 'fechaSincronizacion',
      title: 'Última sincronización',
      type: 'datetime',
      readOnly: true,
      fieldset: 'sincronizado',
      description: '🔒 Auto · Cuándo trajimos esta versión de la reseña desde Google.',
    }),
    defineField({
      name: 'eliminadaEnGoogle',
      title: '¿Eliminada en Google?',
      type: 'boolean',
      initialValue: false,
      readOnly: true,
      fieldset: 'sincronizado',
      description:
        '🔒 Auto · Si el Worker detectó que esta reseña ya no aparece en Google, se marca aquí en lugar de borrarse, por trazabilidad.',
    }),

    // ── Controles editoriales (los únicos editables) ──────────────────
    defineField({
      name: 'oculta',
      title: 'Ocultar de la web',
      type: 'boolean',
      initialValue: false,
      fieldset: 'editorial',
      description:
        '✏️ Editable · Marca para no mostrar esta reseña en el sitio público (sin tener que borrarla en Google). Este valor se conserva en cada sync.',
    }),
    defineField({
      name: 'destacada',
      title: 'Destacar en testimonios',
      type: 'boolean',
      initialValue: false,
      fieldset: 'editorial',
      description:
        '✏️ Editable · Promociona esta reseña al bloque principal de testimonios de la landing. Este valor se conserva en cada sync.',
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
