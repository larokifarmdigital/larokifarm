import { defineType, defineField } from 'sanity';
import {
  validarTodosIdiomasOninguno,
  validarLongitudPorIdioma,
} from '../lib/validacionI18n';

export const farmacia = defineType({
  name: 'farmacia',
  title: 'Farmacia',
  type: 'document',
  fields: [
    // ── Idiomas activos en ESTA farmacia ─────────────────────────────
    defineField({
      name: 'idiomasActivos',
      title: 'Idiomas activos en esta farmacia',
      type: 'array',
      description:
        'Idiomas en los que se publica ESTA farmacia. Escógelos del catálogo "🌐 Idiomas". ' +
        'En cada campo traducible, la validación obliga a rellenar todos los idiomas listados aquí (o dejar el campo vacío en todos).',
      of: [
        {
          type: 'reference',
          to: [{ type: 'idioma' }],
          options: {
            disableNew: false, // permite crear un idioma nuevo desde aquí si hace falta
          },
        },
      ],
      validation: (r) =>
        r
          .required()
          .min(1)
          .unique()
          .custom((items) => {
            if (!Array.isArray(items)) return true;
            const refs = (items as { _ref?: string }[])
              .map((i) => i._ref)
              .filter(Boolean) as string[];
            const dup = refs.filter((c, idx) => refs.indexOf(c) !== idx);
            if (dup.length > 0) {
              return 'No repitas el mismo idioma dos veces.';
            }
            return true;
          }),
    }),

    // ── Identidad básica (no se traduce) ─────────────────────────────
    defineField({
      name: 'nombre',
      title: 'Nombre comercial',
      type: 'string',
      description: 'Nombre de marca. No se traduce.',
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
      name: 'logo',
      title: 'Logo',
      type: 'image',
      options: { hotspot: true },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'titular',
      title: 'Farmacéutico/a titular',
      type: 'string',
    }),
    defineField({
      name: 'numeroColegiado',
      title: 'Nº de colegiado',
      type: 'string',
    }),
    defineField({
      name: 'comunidadPredeterminada',
      title: 'Comunidad autónoma del calendario',
      type: 'reference',
      to: [{ type: 'comunidad' }],
      description:
        'CCAA cuyo calendario de vacunación se destaca por defecto en /calendario-vacunacion de esta farmacia. Si se deja vacío, se muestra solo el índice.',
    }),

    // ── Google Business Profile (reseñas) ────────────────────────────
    defineField({
      name: 'googleLocationName',
      title: 'Google Business Profile · Resource name',
      type: 'string',
      description:
        'Identificador del negocio en Google Business Profile, formato "accounts/{accountId}/locations/{locationId}". El Worker de sincronización lo usa para traer las reseñas. Se rellena cuando Google aprueba el acceso a la API.',
      validation: (r) =>
        r.regex(/^accounts\/\d+\/locations\/\d+$/, {
          name: 'business profile resource name',
          invert: false,
        }).warning(
          'Formato esperado: accounts/<accountId>/locations/<locationId>',
        ),
    }),
    defineField({
      name: 'googleMapsUrl',
      title: 'Google Maps · URL pública',
      type: 'url',
      description:
        'URL completa de la ficha pública en Google Maps. La usa la web para el botón "Ver en Google". Cópiala desde maps.google.com → buscar la farmacia → "Compartir" → "Copiar enlace".',
    }),

    // ── Hero (traducible) ────────────────────────────────────────────
    defineField({
      name: 'descripcionCorta',
      title: 'Descripción corta (Hero + SEO)',
      type: 'internationalizedArrayText',
      description:
        'Frase principal del Hero y meta description del SEO. Máx. ~180 caracteres por idioma.',
      validation: (r) => [
        validarTodosIdiomasOninguno(r),
        validarLongitudPorIdioma(180)(r),
      ],
    }),
    defineField({
      name: 'imagenes',
      title: 'Imágenes principales (Hero)',
      type: 'array',
      description:
        'De 1 a 6 imágenes. Las imágenes son compartidas entre idiomas; solo el alt se traduce.',
      of: [
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            {
              name: 'alt',
              title: 'Texto alternativo (alt)',
              type: 'internationalizedArrayString',
              description:
                'Describe la imagen para SEO y accesibilidad. Rellena en cada idioma activo.',
              validation: (r) => validarTodosIdiomasOninguno(r),
            },
          ],
        },
      ],
      validation: (r) => r.required().min(1).max(6),
    }),

    // ── Sobre nosotros (mixto) ───────────────────────────────────────
    defineField({
      name: 'sobreNosotros',
      title: 'Sobre nosotros',
      type: 'object',
      description: 'Contenido de la sección "Sobre nosotros" en la landing.',
      fields: [
        {
          name: 'titulo',
          title: 'Título',
          type: 'internationalizedArrayString',
          description: 'Ej.: "Una farmacia para familias". Se resaltan las dos últimas palabras.',
          validation: (r) => validarTodosIdiomasOninguno(r),
        },
        {
          name: 'anyosExperiencia',
          title: 'Años de experiencia',
          type: 'number',
          description: 'Badge "+X años". No se traduce.',
          validation: (r) => r.min(0).max(200),
        },
        {
          name: 'puntos',
          title: 'Puntos destacados',
          type: 'array',
          of: [{ type: 'internationalizedArrayString' }],
          description: 'Lista de 4-6 frases cortas. Cada punto se traduce en todos los idiomas activos.',
          validation: (r) => r.max(8),
        },
      ],
    }),
    defineField({
      name: 'descripcionLarga',
      title: 'Descripción larga (Sobre nosotros)',
      type: 'internationalizedArrayPortableText',
      description: 'Cuerpo principal de la sección "Sobre nosotros".',
      validation: (r) => validarTodosIdiomasOninguno(r),
    }),
    defineField({
      name: 'imagenesSobre',
      title: 'Imágenes "Sobre nosotros"',
      type: 'array',
      description: 'De 1 a 6 imágenes. Compartidas entre idiomas; solo el alt se traduce.',
      of: [
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            {
              name: 'alt',
              title: 'Texto alternativo (alt)',
              type: 'internationalizedArrayString',
              validation: (r) => validarTodosIdiomasOninguno(r),
            },
          ],
        },
      ],
      validation: (r) => r.min(1).max(6),
    }),

    // ── Servicios (traducible + icono/enlace compartidos) ────────────
    defineField({
      name: 'servicios',
      title: 'Servicios',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'nombre',
              title: 'Nombre',
              type: 'internationalizedArrayString',
              validation: (r) => validarTodosIdiomasOninguno(r),
            },
            {
              name: 'descripcion',
              title: 'Descripción',
              type: 'internationalizedArrayText',
              validation: (r) => validarTodosIdiomasOninguno(r),
            },
            {
              name: 'icono',
              title: 'Icono',
              type: 'string',
              description: 'Elige un icono. Se renderiza con estilo lucide. Compartido entre idiomas.',
              options: {
                list: [
                  { title: '❤️  Corazón (cuidado general)', value: 'heart' },
                  { title: '💓  Corazón pulso (cardio)', value: 'heart-pulse' },
                  { title: '💊  Pastilla (medicación)', value: 'pill' },
                  { title: '💉  Jeringa (vacunación)', value: 'syringe' },
                  { title: '🩺  Estetoscopio (consulta)', value: 'stethoscope' },
                  { title: '🌡️  Termómetro (síntomas/fiebre)', value: 'thermometer' },
                  { title: '👶  Bebé (cuidado infantil)', value: 'baby' },
                  { title: '💧  Gota (dermocosmética)', value: 'droplet' },
                  { title: '☀️  Sol (protección solar)', value: 'sun' },
                  { title: '🛡️  Escudo (protección)', value: 'shield' },
                  { title: '✨  Brillo (cosmética)', value: 'sparkles' },
                  { title: '🍃  Hoja (productos naturales)', value: 'leaf' },
                  { title: '🧠  Cerebro (salud mental)', value: 'brain' },
                  { title: '📈  Pulso (vitalidad)', value: 'activity' },
                  { title: '🏆  Premio (calidad)', value: 'award' },
                  { title: '👥  Personas / familias', value: 'users' },
                  { title: '⭐  Estrella (favoritos)', value: 'star' },
                  { title: '🕐  Reloj (horario)', value: 'clock' },
                ],
                layout: 'dropdown',
              },
            },
            {
              name: 'enlace',
              title: 'Enlace al hacer click (opcional)',
              type: 'object',
              description:
                'Si rellenas la URL, toda la card será clicable. Compartido entre idiomas.',
              fields: [
                {
                  name: 'url',
                  title: 'URL, ancla o ruta interna',
                  type: 'string',
                  description:
                    'Acepta: URL externa (https://...), ancla (#sobre), o ruta interna (/aviso-legal).',
                },
                {
                  name: 'nuevaPestana',
                  title: 'Abrir en una pestaña nueva',
                  type: 'boolean',
                  initialValue: false,
                  description: 'Recomendado para enlaces externos.',
                },
              ],
            },
          ],
          preview: {
            select: { title: 'nombre.0.value', subtitle: 'descripcion.0.value' },
          },
        },
      ],
    }),

    // ── FAQs (traducibles) ───────────────────────────────────────────
    defineField({
      name: 'faqs',
      title: 'Preguntas frecuentes',
      type: 'array',
      description:
        'Preguntas y respuestas habituales. Aparecen en la landing y se publican como FAQ schema. Recomendado: 4-8.',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'pregunta',
              title: 'Pregunta',
              type: 'internationalizedArrayString',
              validation: (r) => [
                validarTodosIdiomasOninguno(r),
                validarLongitudPorIdioma(200)(r),
              ],
            },
            {
              name: 'respuesta',
              title: 'Respuesta',
              type: 'internationalizedArrayText',
              validation: (r) => validarTodosIdiomasOninguno(r),
            },
          ],
          preview: {
            select: { title: 'pregunta.0.value', subtitle: 'respuesta.0.value' },
          },
        },
      ],
      validation: (r) => r.max(15),
    }),

    // ── Contacto y localización (compartidos) ────────────────────────
    defineField({
      name: 'direccion',
      title: 'Dirección',
      type: 'object',
      fields: [
        { name: 'calle', title: 'Calle y número', type: 'string' },
        { name: 'codigoPostal', title: 'Código postal', type: 'string' },
        { name: 'ciudad', title: 'Ciudad', type: 'string' },
        { name: 'provincia', title: 'Provincia', type: 'string' },
        { name: 'pais', title: 'País', type: 'string', initialValue: 'España' },
      ],
    }),
    defineField({
      name: 'mapaUrl',
      title: 'URL de Google Maps',
      type: 'url',
      description:
        'En Google Maps: Compartir → "Insertar un mapa" → copia el src del iframe. Si pegas un enlace normal se usa para el botón "Cómo llegar" y el iframe cae a la dirección.',
    }),
    defineField({
      name: 'contacto',
      title: 'Contacto',
      type: 'object',
      fields: [
        { name: 'telefono', title: 'Teléfono', type: 'string' },
        { name: 'whatsapp', title: 'WhatsApp', type: 'string' },
        { name: 'email', title: 'Email', type: 'string' },
        { name: 'web', title: 'Web', type: 'url' },
      ],
    }),
    defineField({
      name: 'horarios',
      title: 'Horarios de apertura',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'dia',
              title: 'Día',
              type: 'string',
              options: {
                list: [
                  { title: 'Lunes', value: 'Mo' },
                  { title: 'Martes', value: 'Tu' },
                  { title: 'Miércoles', value: 'We' },
                  { title: 'Jueves', value: 'Th' },
                  { title: 'Viernes', value: 'Fr' },
                  { title: 'Sábado', value: 'Sa' },
                  { title: 'Domingo', value: 'Su' },
                ],
              },
              validation: (r) => r.required(),
            },
            { name: 'apertura', title: 'Apertura (HH:MM)', type: 'string' },
            { name: 'cierre', title: 'Cierre (HH:MM)', type: 'string' },
            { name: 'cerrado', title: 'Cerrado todo el día', type: 'boolean', initialValue: false },
          ],
          preview: {
            select: { dia: 'dia', a: 'apertura', c: 'cierre', cerrado: 'cerrado' },
            prepare({ dia, a, c, cerrado }) {
              return {
                title: dia ?? '—',
                subtitle: cerrado ? 'Cerrado' : `${a ?? '?'} – ${c ?? '?'}`,
              };
            },
          },
        },
      ],
    }),
    defineField({
      name: 'redesSociales',
      title: 'Redes sociales',
      type: 'object',
      fields: [
        { name: 'instagram', title: 'Instagram (URL)', type: 'url' },
        { name: 'facebook', title: 'Facebook (URL)', type: 'url' },
        { name: 'tiktok', title: 'TikTok (URL)', type: 'url' },
      ],
    }),

    // ── SEO ──────────────────────────────────────────────────────────
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'object',
      fields: [
        {
          name: 'titulo',
          title: 'Título SEO (<title>)',
          type: 'internationalizedArrayString',
          description: 'Si se deja vacío se usa "Nombre · Ciudad". Máx. 70 caracteres por idioma.',
          validation: (r) => [
            validarTodosIdiomasOninguno(r),
            validarLongitudPorIdioma(70)(r),
          ],
        },
        {
          name: 'imagenOg',
          title: 'Imagen Open Graph',
          type: 'image',
          description:
            'Imagen al compartir en WhatsApp, Facebook, etc. 1200×630 px, JPG/PNG, < 1 MB. Compartida entre idiomas.',
          options: { hotspot: true },
        },
      ],
    }),
  ],
  preview: {
    select: { title: 'nombre', subtitle: 'direccion.ciudad' },
  },
});
