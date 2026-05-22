import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [preact()],
  publicDir: 'public',
  build: {
    target: 'es2019',
    lib: {
      entry: resolve(__dirname, 'src/main.tsx'),
      name: 'CimaChat',
      formats: ['iife', 'es'],
      fileName: (format) => format === 'iife' ? 'cima-chat.iife.js' : 'cima-chat.es.js',
    },
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  server: {
    open: '/index.html',
  },
});
