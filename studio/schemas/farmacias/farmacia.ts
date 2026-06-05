import { defineType, defineField } from 'sanity';
import {
  validarTodosIdiomasOninguno,
  validarLongitudPorIdioma,
} from '../lib/validacionI18n';

/**
 * Helper para los sub-objetos "Textos de cabecera" de Servicios/FAQs/Reseñas.
 * Cada sección tiene siempre los mismos 3 campos i18n (chip, titulo, subtitulo).
 * En la web se resaltan automáticamente las dos últimas palabras del título.
 */
function textosCabeceraSeccion(opts: {
  name: string;
  title: string;
  defaults: { chip: string; titulo: string; subtitulo: string };
  group: string;
}) {
  return defineField({
    name: opts.name,
    title: opts.title,
    type: 'object',
    group: opts.group,
    options: { collapsible: true, collapsed: true },
    description:
      'Personaliza el chip, título y subtítulo. Si dejas un campo vacío se usa el texto por defecto del sitio.',
    fields: [
      {
        name: 'chip',
        title: 'Chip (etiqueta superior)',
        type: 'internationalizedArrayString',
        description: `Por defecto: "${opts.defaults.chip}".`,
        validation: (r) => validarTodosIdiomasOninguno(r),
      },
      {
        name: 'titulo',
        title: 'Título',
        type: 'internationalizedArrayString',
        description: `Por defecto: "${opts.defaults.titulo}". Se resaltan en color las dos últimas palabras automáticamente (si solo hay dos palabras, se resalta la última).`,
        validation: (r) => validarTodosIdiomasOninguno(r),
      },
      {
        name: 'subtitulo',
        title: 'Subtítulo',
        type: 'internationalizedArrayText',
        description: `Por defecto: "${opts.defaults.subtitulo}".`,
        validation: (r) => validarTodosIdiomasOninguno(r),
      },
    ],
  });
}

export const farmacia = defineType({
  name: 'farmacia',
  title: 'Farmacia',
  type: 'document',
  groups: [
    { name: 'identidad', title: '🪪 Identidad', default: true },
    { name: 'hero', title: '🦸 Hero' },
    { name: 'features', title: '✨ Features (bajo el hero)' },
    { name: 'sobreNosotros', title: '👥 Sobre nosotros' },
    { name: 'servicios', title: '🛒 Servicios' },
    { name: 'faqs', title: '❓ FAQs' },
    { name: 'resenas', title: '⭐ Reseñas' },
    { name: 'contacto', title: '📞 Contacto y horarios' },
    { name: 'legal', title: '⚖️ Legal' },
    { name: 'seo', title: '🔍 SEO' },
  ],
  fields: [
    // ── Identidad ────────────────────────────────────────────────────
    defineField({
      name: 'idiomasActivos',
      title: 'Idiomas activos en esta farmacia',
      type: 'array',
      group: 'identidad',
      description:
        'Idiomas en los que se publica ESTA farmacia. Escógelos del catálogo "🌐 Idiomas". ' +
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
          .unique()
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
      title: 'Nombre comercial',
      type: 'string',
      group: 'identidad',
      description: 'Nombre de marca. No se traduce.',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug (URL)',
      type: 'slug',
      group: 'identidad',
      options: { source: 'nombre', maxLength: 60 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'image',
      group: 'identidad',
      options: { hotspot: true },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'titular',
      title: 'Farmacéutico/a titular',
      type: 'string',
      group: 'identidad',
    }),
    defineField({
      name: 'numeroColegiado',
      title: 'Nº de colegiado',
      type: 'string',
      group: 'identidad',
    }),
    defineField({
      name: 'comunidadPredeterminada',
      title: 'Comunidad autónoma del calendario',
      type: 'reference',
      group: 'identidad',
      to: [{ type: 'comunidad' }],
      description:
        'CCAA cuyo calendario de vacunación se destaca por defecto en /calendario-vacunacion de esta farmacia. Si se deja vacío, se muestra solo el índice.',
    }),

    // ── Hero ─────────────────────────────────────────────────────────
    defineField({
      name: 'heroChip',
      title: 'Chip del Hero (etiqueta superior pequeña)',
      type: 'internationalizedArrayString',
      group: 'hero',
      description:
        'Texto pequeño que aparece en el chip arriba del título principal. Si lo dejas vacío se usa "Farmacia en {ciudad}" o "Tu farmacia de confianza".',
      validation: (r) => validarTodosIdiomasOninguno(r),
    }),
    defineField({
      name: 'heroSubtitulo',
      title: 'Subtítulo bajo el título (Hero)',
      type: 'internationalizedArrayString',
      group: 'hero',
      description:
        'Línea destacada justo debajo del nombre de la farmacia. Por defecto: "Farmacia en {ciudad}". Ejemplo libre: "Tu farmacia familiar en el Eixample".',
      validation: (r) => validarTodosIdiomasOninguno(r),
    }),
    defineField({
      name: 'descripcionCorta',
      title: 'Claim / descripción corta (Hero + SEO)',
      type: 'internationalizedArrayText',
      group: 'hero',
      description:
        'Frase de apoyo bajo el subtítulo del hero y meta description del SEO. Máx. ~180 caracteres por idioma.',
      validation: (r) => [
        validarTodosIdiomasOninguno(r),
        validarLongitudPorIdioma(180)(r),
      ],
    }),
    defineField({
      name: 'imagenes',
      title: 'Imágenes principales (slider del Hero)',
      type: 'array',
      group: 'hero',
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
    defineField({
      name: 'heroTarjetasFlotantes',
      title: 'Tarjetas flotantes sobre la imagen del Hero',
      type: 'array',
      group: 'hero',
      description:
        'De 0 a 3 tarjetas que flotan sobre la imagen principal. Cada una con un icono, un título y un subtítulo. La posición visual se asigna automáticamente.',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'icono',
              title: 'Icono',
              type: 'iconoLucide',
              validation: (r) => r.required(),
            },
            {
              name: 'titulo',
              title: 'Título',
              type: 'internationalizedArrayString',
              validation: (r) => validarTodosIdiomasOninguno(r),
            },
            {
              name: 'subtitulo',
              title: 'Subtítulo',
              type: 'internationalizedArrayString',
              validation: (r) => validarTodosIdiomasOninguno(r),
            },
          ],
          preview: {
            select: { title: 'titulo.0.value', subtitle: 'subtitulo.0.value', icono: 'icono' },
            prepare({ title, subtitle, icono }) {
              return {
                title: title ?? '(sin título)',
                subtitle: [icono ? `[${icono}]` : null, subtitle].filter(Boolean).join(' · '),
              };
            },
          },
        },
      ],
      validation: (r) => r.max(3),
    }),

    // ── Features (sección bajo el hero) ──────────────────────────────
    defineField({
      name: 'featuresLista',
      title: 'Tarjetas de la sección Features',
      type: 'array',
      group: 'features',
      description:
        'Lista editable de tarjetas (recomendado 4). Aparecen en la franja bajo el Hero. ' +
        'Si una tarjeta usa el icono "reloj" y dejas la descripción vacía, la web muestra ' +
        'automáticamente el horario calculado (ej. "Lunes a Sábado").',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'icono',
              title: 'Icono',
              type: 'iconoLucide',
              validation: (r) => r.required(),
            },
            {
              name: 'titulo',
              title: 'Título',
              type: 'internationalizedArrayString',
              validation: (r) => validarTodosIdiomasOninguno(r),
            },
            {
              name: 'descripcion',
              title: 'Descripción (opcional si el icono es "reloj")',
              type: 'internationalizedArrayString',
              description:
                'Si dejas esto vacío y el icono es "reloj", la web mostrará el horario auto-calculado.',
              validation: (r) => validarTodosIdiomasOninguno(r),
            },
          ],
          preview: {
            select: { title: 'titulo.0.value', subtitle: 'descripcion.0.value', icono: 'icono' },
            prepare({ title, subtitle, icono }) {
              return {
                title: title ?? '(sin título)',
                subtitle: [icono ? `[${icono}]` : null, subtitle].filter(Boolean).join(' · '),
              };
            },
          },
        },
      ],
      validation: (r) => r.max(6),
    }),

    // ── Sobre nosotros ───────────────────────────────────────────────
    defineField({
      name: 'sobreNosotros',
      title: 'Sobre nosotros',
      type: 'object',
      group: 'sobreNosotros',
      description: 'Contenido de la sección "Sobre nosotros" en la landing.',
      fields: [
        {
          name: 'chip',
          title: 'Chip (etiqueta superior)',
          type: 'internationalizedArrayString',
          description: 'Por defecto: "Sobre nosotros".',
          validation: (r) => validarTodosIdiomasOninguno(r),
        },
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
      title: 'Descripción larga (cuerpo de Sobre nosotros)',
      type: 'internationalizedArrayPortableText',
      group: 'sobreNosotros',
      description: 'Cuerpo principal de la sección "Sobre nosotros".',
      validation: (r) => validarTodosIdiomasOninguno(r),
    }),
    defineField({
      name: 'imagenesSobre',
      title: 'Imágenes "Sobre nosotros"',
      type: 'array',
      group: 'sobreNosotros',
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

    // ── Servicios ────────────────────────────────────────────────────
    textosCabeceraSeccion({
      name: 'textosServicios',
      title: 'Textos de cabecera de Servicios',
      group: 'servicios',
      defaults: {
        chip: 'Nuestros servicios',
        titulo: 'Nuestros servicios',
        subtitulo: 'Ofrecemos una amplia gama de servicios farmacéuticos…',
      },
    }),
    defineField({
      name: 'servicios',
      title: 'Lista de servicios',
      type: 'array',
      group: 'servicios',
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
              type: 'iconoLucide',
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

    // ── FAQs ─────────────────────────────────────────────────────────
    textosCabeceraSeccion({
      name: 'textosFaqs',
      title: 'Textos de cabecera de FAQs',
      group: 'faqs',
      defaults: {
        chip: 'Preguntas frecuentes',
        titulo: 'Resolvemos tus dudas',
        subtitulo: 'Las preguntas más habituales que nos hacen…',
      },
    }),
    defineField({
      name: 'faqs',
      title: 'Lista de preguntas',
      type: 'array',
      group: 'faqs',
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

    // ── Reseñas ──────────────────────────────────────────────────────
    textosCabeceraSeccion({
      name: 'textosResenas',
      title: 'Textos de cabecera de Reseñas',
      group: 'resenas',
      defaults: {
        chip: 'Reseñas Google',
        titulo: 'Lo que dicen nuestros clientes',
        subtitulo: 'Opiniones reales de personas que han pasado por la farmacia.',
      },
    }),
    defineField({
      name: 'googleLocationName',
      title: 'Google Business Profile · Resource name',
      type: 'string',
      group: 'resenas',
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
      group: 'resenas',
      description:
        'URL completa de la ficha pública en Google Maps. La usa la web para el botón "Ver en Google". Cópiala desde maps.google.com → buscar la farmacia → "Compartir" → "Copiar enlace".',
    }),

    // ── Contacto y localización ──────────────────────────────────────
    defineField({
      name: 'direccion',
      title: 'Dirección',
      type: 'object',
      group: 'contacto',
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
      title: 'URL de Google Maps (iframe)',
      type: 'url',
      group: 'contacto',
      description:
        'En Google Maps: Compartir → "Insertar un mapa" → copia el src del iframe. Si pegas un enlace normal se usa para el botón "Cómo llegar" y el iframe cae a la dirección.',
    }),
    defineField({
      name: 'contacto',
      title: 'Contacto',
      type: 'object',
      group: 'contacto',
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
      group: 'contacto',
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
      group: 'contacto',
      fields: [
        { name: 'instagram', title: 'Instagram (URL)', type: 'url' },
        { name: 'facebook', title: 'Facebook (URL)', type: 'url' },
        { name: 'tiktok', title: 'TikTok (URL)', type: 'url' },
      ],
    }),

    // ── Legal ────────────────────────────────────────────────────────
    defineField({
      name: 'avisoLegal',
      title: 'Aviso legal',
      type: 'internationalizedArrayPortableText',
      group: 'legal',
      description:
        'Texto completo del aviso legal. Si se deja vacío, la web muestra el aviso legal por defecto. ' +
        'Rellénalo en cada idioma activo (o déjalo vacío en todos).',
      validation: (r) => validarTodosIdiomasOninguno(r),
    }),
    defineField({
      name: 'politicaPrivacidad',
      title: 'Política de privacidad',
      type: 'internationalizedArrayPortableText',
      group: 'legal',
      description:
        'Texto completo de la política de privacidad. Si se deja vacío, la web muestra la política por defecto. ' +
        'Rellénalo en cada idioma activo (o déjalo vacío en todos).',
      validation: (r) => validarTodosIdiomasOninguno(r),
    }),

    // ── SEO ──────────────────────────────────────────────────────────
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'object',
      group: 'seo',
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
