import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://calendarios.farmacia.example',
  output: 'static',
  trailingSlash: 'never',
  build: {
    format: 'directory',
  },
});
