import type { Locale } from './i18n';

export interface RouteSeoInput {
  titulo: string;
  descripcion_corta: string;
  fecha: Date;
  slug: string;
  locale: Locale;
  ogImage?: string;
  siteUrl: string;
}

export function buildRouteJsonLd(input: RouteSeoInput) {
  const url = `${input.siteUrl}${input.locale === 'es' ? '' : '/en'}/rutas/${input.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.titulo,
    description: input.descripcion_corta,
    datePublished: input.fecha.toISOString(),
    inLanguage: input.locale,
    url,
    image: input.ogImage ? [input.ogImage] : undefined,
    author: {
      '@type': 'Person',
      name: 'Desnivel',
    },
  };
}
