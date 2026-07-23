export type Locale = 'es' | 'en';

export const locales: Locale[] = ['es', 'en'];
export const defaultLocale: Locale = 'es';

const dict = {
  es: {
    nav_home: 'Inicio',
    nav_routes: 'Rutas',
    nav_about: 'Acerca',
    home_title: 'Desnivel',
    home_tagline: 'Todo lo que necesitas para recorrer estas rutas, contado por alguien que ya las hizo.',
    home_eyebrow: 'Trail running · Hiking · Travesías',
    routes_index_title: 'Rutas',
    routes_index_lead:
      'Un archivo editorial de rutas recorridas, documentadas con datos reales de GPX: distancia, desnivel, altitud y el relato de cada tramo.',
    stat_distance: 'Distancia',
    stat_gain: 'Desnivel +',
    stat_max_alt: 'Altitud máx.',
    stat_time: 'Tiempo estimado',
    stat_difficulty: 'Dificultad',
    stat_start: 'Inicio',
    stat_end: 'Fin',
    map_heading: 'El recorrido',
    elevation_heading: 'Perfil de elevación',
    segments_heading: 'El recorrido por tramos',
    warnings_heading: 'Ojo con esto',
    recommendations_heading: 'Recomendaciones',
    weather_heading: 'Clima ideal',
    gear_heading: 'Equipo sugerido',
    water_food_heading: 'Agua y comida',
    highlights_heading: 'Lo más destacado',
    gallery_heading: 'Galería',
    gpx_cta: 'Descargar GPX',
    strava_cta: 'Ver en Strava',
    more_routes: 'Más rutas',
    back_to_routes: 'Volver a rutas',
    prev_route: 'Ruta anterior',
    next_route: 'Siguiente ruta',
    theme_toggle: 'Cambiar tema',
    footer_note: 'Rutas documentadas y publicadas por',
    read_route: 'Ver ruta',
    about_title: 'Acerca de Desnivel',
    where_heading: 'Dónde están las rutas',
    reel_heading: 'Míralo en video',
  },
  en: {
    nav_home: 'Home',
    nav_routes: 'Routes',
    nav_about: 'About',
    home_title: 'Desnivel',
    home_tagline: "Everything you need to take on these routes, told by someone who's already done them.",
    home_eyebrow: 'Trail running · Hiking · Multi-day treks',
    routes_index_title: 'Routes',
    routes_index_lead:
      'An editorial archive of routes, documented with real GPX data: distance, elevation gain, altitude, and the story of every stretch.',
    stat_distance: 'Distance',
    stat_gain: 'Elevation gain',
    stat_max_alt: 'Max altitude',
    stat_time: 'Estimated time',
    stat_difficulty: 'Difficulty',
    stat_start: 'Start',
    stat_end: 'End',
    map_heading: 'The route',
    elevation_heading: 'Elevation profile',
    segments_heading: 'The route, stretch by stretch',
    warnings_heading: 'Heads up',
    recommendations_heading: 'Recommendations',
    weather_heading: 'Ideal weather',
    gear_heading: 'Suggested gear',
    water_food_heading: 'Water & food',
    highlights_heading: 'Highlights',
    gallery_heading: 'Gallery',
    gpx_cta: 'Download GPX',
    strava_cta: 'View on Strava',
    more_routes: 'More routes',
    back_to_routes: 'Back to routes',
    prev_route: 'Previous route',
    next_route: 'Next route',
    theme_toggle: 'Toggle theme',
    footer_note: 'Routes documented and published by',
    read_route: 'Read route',
    about_title: 'About Desnivel',
    where_heading: 'Where the routes are',
    reel_heading: 'Watch the video',
  },
} as const;

export type DictKey = keyof (typeof dict)['es'];

export function t(locale: Locale, key: DictKey): string {
  return dict[locale][key];
}

export function routePath(locale: Locale, slug?: string): string {
  const base = locale === defaultLocale ? '' : `/${locale}`;
  if (!slug) return `${base}/rutas` || '/rutas';
  return `${base}/rutas/${slug}`;
}

export function localePath(locale: Locale, path: string): string {
  const base = locale === defaultLocale ? '' : `/${locale}`;
  return `${base}${path}` || '/';
}

const difficultyLabels: Record<Locale, Record<string, string>> = {
  es: { baja: 'baja', media: 'media', alta: 'alta', 'muy alta': 'muy alta' },
  en: { baja: 'low', media: 'moderate', alta: 'high', 'muy alta': 'very high' },
};

export function translateDifficulty(locale: Locale, value: string): string {
  return difficultyLabels[locale][value] ?? value;
}

const typeLabels: Record<Locale, Record<string, string>> = {
  es: { 'trail running': 'trail running', hiking: 'hiking', travesía: 'travesía' },
  en: { 'trail running': 'trail running', hiking: 'hiking', travesía: 'multi-day trek' },
};

export function translateType(locale: Locale, value: string): string {
  return typeLabels[locale][value] ?? value;
}
