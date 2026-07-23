import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// IMPORTANT: replace with your real production domain once you have one —
// required for correct sitemap.xml / canonical / Open Graph URLs.
const SITE_URL = 'https://tu-dominio.example';

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [sitemap()],
});
