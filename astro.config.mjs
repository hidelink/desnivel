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
  integrations: [
    sitemap({
      // /editar-perfil is a private settings page (noindex anyway), and the
      // bare /perfil is just the template every real /<username> profile
      // renders into — neither is a URL worth sending a crawler to.
      filter: (page) => page !== `${SITE_URL}/editar-perfil/` && page !== `${SITE_URL}/perfil/`,
    }),
  ],
});
