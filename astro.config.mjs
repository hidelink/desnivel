import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const SITE_URL = 'https://desnivel.run';

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  // The English homepage was removed — the Trail Analyzer restored at "/" has no i18n
  // (it never did), so /en now just lands on the same Spanish tool instead of a 404.
  // /en/rutas and /en/acerca (the translated editorial archive) are unaffected.
  redirects: {
    '/en': '/',
  },
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [sitemap()],
});
