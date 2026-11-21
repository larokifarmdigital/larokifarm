import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { loadEnv } from 'vite';
import { redireccionesIdiomas } from './integraciones/redirecciones-idiomas.mjs';

const env = loadEnv(process.env.NODE_ENV ?? '', process.cwd(), '');
const SITE_URL = process.env.SITE_URL ?? env.SITE_URL;

if (!SITE_URL) {
  throw new Error(
    '[env] Falta la variable de entorno requerida: SITE_URL. ' +
      'Defínela en .env (local) o en las Environment variables del hosting.',
  );
}

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  trailingSlash: 'never',
  build: {
    format: 'directory',
  },
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en', 'ca', 'fr', 'de', 'it', 'pt', 'eu', 'gl'],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    redireccionesIdiomas(),
    sitemap({
      changefreq: 'monthly',
      priority: 0.8,
      i18n: {
        defaultLocale: 'es',
        locales: {
          es: 'es-ES',
          en: 'en-US',
          ca: 'ca-ES',
          fr: 'fr-FR',
          de: 'de-DE',
          it: 'it-IT',
          pt: 'pt-PT',
          eu: 'eu-ES',
          gl: 'gl-ES',
        },
      },
    }),
  ],
});
