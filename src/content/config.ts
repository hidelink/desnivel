import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const rutas = defineCollection({
  // Content Layer loader (not the legacy `type: 'content'`) — avoids Astro's
  // legacy behavior of reserving/stripping a frontmatter `slug` key for routing.
  // A custom generateId is required too: the loader's default id generator also
  // reads frontmatter `slug` directly (ignoring the file's folder), which would
  // collide es/<slug>.md with en/<slug>.md into a single entry. Deriving the id
  // from the relative file path instead keeps the two locales as separate entries.
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/rutas',
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
  }),
  schema: () =>
    z.object({
      slug: z.string(),
      titulo: z.string(),
      subtitulo: z.string(),
      tipo: z.enum(['trail running', 'hiking', 'travesía']),
      zona: z.string(),
      ubicacion: z.string(),
      fecha: z.date(),

      distancia_km: z.number().positive(),
      desnivel_m: z.number().positive(),
      altitud_max_m: z.number().positive(),
      tiempo_estimado: z.string(),
      dificultad: z.enum(['baja', 'media', 'alta', 'muy alta']),

      inicio: z.string(),
      fin: z.string(),
      descripcion_corta: z.string(),

      segmentos: z
        .array(
          z.object({
            title: z.string(),
            label: z.string(),
            copy: z.string(),
          })
        )
        .default([]),

      recomendaciones: z.array(z.string()).default([]),
      advertencias: z.array(z.string()).default([]),

      clima_ideal: z.string(),
      equipo_sugerido: z.array(z.string()).default([]),
      agua_comida: z.string(),

      gpx_url: z.string(),
      strava_url: z.string().url().optional(),

      gallery: z
        .array(
          z.object({
            src: z.string(),
            alt: z.string(),
            caption: z.string().optional(),
          })
        )
        .default([]),

      // Optional editorial overrides — real numbers/track always derive from gpx_url.
      mapa: z
        .object({
          lat: z.number().optional(),
          lon: z.number().optional(),
          zoom: z.number().optional(),
        })
        .optional(),
      perfil_elevacion: z
        .object({
          nota: z.string().optional(),
        })
        .optional(),

      highlights: z.array(z.string()).default([]),

      draft: z.boolean().default(false),
    }),
});

export const collections = { rutas };
