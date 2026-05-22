import { defineConfig, defineField, defineArrayMember } from 'sanity';
import type { SanityClient } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { internationalizedArray } from 'sanity-plugin-internationalized-array';
import { cimaSchemaTypes } from './schemas/cima';
import { calendarioSchemaTypes } from './schemas/calendario';
import { farmaciasSchemaTypes } from './schemas/farmacias';
import { idiomasSchemaTypes } from './schemas/idiomas';
import { calendarioStructure } from './structure';

const projectId = process.env.SANITY_STUDIO_PROJECT_ID || 'yovi040n';

const IDIOMAS_FALLBACK = [{ id: 'es', title: 'Español' }];

const cargarIdiomas = async (client: SanityClient) => {
  try {
    const lista = await client.fetch<{ id?: string; title?: string }[]>(
      `*[_type=="idioma"]{ "id": codigo, "title": nombre } | order(title asc)`,
    );
    const limpia = (lista ?? [])
      .filter((i) => i.id && i.title)
      .map((i) => ({ id: i.id as string, title: i.title as string }));
    return limpia.length > 0 ? limpia : IDIOMAS_FALLBACK;
  } catch {
    return IDIOMAS_FALLBACK;
  }
};

export default defineConfig([
  {
    name: 'cima-chat',
    title: 'Cima Chat',
    subtitle: 'Síntomas y perfiles del widget',
    basePath: '/cima-chat',
    projectId,
    dataset: 'cima',
    plugins: [structureTool(), visionTool()],
    schema: { types: cimaSchemaTypes },
  },
  {
    name: 'calendario-vacunas',
    title: 'Contenido editorial',
    subtitle: 'Calendarios de vacunación y fichas de farmacia',
    basePath: '/calendario',
    projectId,
    dataset: 'calendario',
    plugins: [
      structureTool({ structure: calendarioStructure }),
      internationalizedArray({
        languages: cargarIdiomas,
        // Cuando se haga "Add language" en un campo i18n vacío, el plugin
        // pre-crea entradas para estos idiomas a la vez. Si añades un idioma
        // nuevo al catálogo (PT, FR…) recuerda añadirlo también aquí.
        defaultLanguages: ['es', 'en', 'ca'],
        fieldTypes: [
          'string',
          defineField({
            name: 'text',
            type: 'text',
            rows: 3,
            title: 'Texto largo',
          }),
          defineField({
            name: 'portableText',
            type: 'array',
            title: 'Texto enriquecido',
            of: [defineArrayMember({ type: 'block' })],
          }),
        ],
      }),
      visionTool(),
    ],
    schema: {
      types: [
        ...idiomasSchemaTypes,
        ...calendarioSchemaTypes,
        ...farmaciasSchemaTypes,
      ],
    },
  },
]);
