// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  i18n: {
    defaultLocale: 'he',
    locales: ['he', 'ru'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  redirects: {
    '/accessibility': '/hatzara',
    '/privacy': '/prat',
    '/ru/accessibility': '/ru/hatzara',
    '/ru/privacy': '/ru/prat',
  },
  build: {
    inlineStylesheets: 'always',
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      target: 'es2022',
    },
  },
});