# Desnivel

Un sitio editorial para publicar tus propias rutas de trail running, hiking y travesías —
cada una documentada con datos reales de GPX (distancia, desnivel, altitud, mapa, perfil de
elevación) y contada como una crónica, no como una ficha genérica.

**No es una herramienta para "sube cualquier GPX y analízalo".** Es un sistema para publicar
rutas que tú ya recorriste, en un formato consistente y fácil de mantener: un archivo Markdown
por ruta + su `.gpx`, y el sitio genera el mapa, el perfil de elevación y las estadísticas por ti.

## Stack

- **[Astro](https://astro.build)** (output estático) — content-first, cero JS por defecto,
  Content Collections con validación por esquema (Zod), y soporte i18n nativo. Ver la sección
  "Por qué Astro" más abajo para el detalle de la decisión.
- **Leaflet** — el único componente interactivo real del sitio (el mapa). Se hidrata solo
  cuando entra en pantalla (`IntersectionObserver`), no de entrada.
- **OpenTopoMap** para los tiles del mapa (contornos/relieve real, no un basemap político-urbano
  que se ve vacío en zonas de montaña remotas) — sin API key.
- **`fast-xml-parser`** para leer los `.gpx` en build time.
- **Fraunces + Inter + IBM Plex Mono** (self-hosted vía `@fontsource`, sin CDN externo) para la
  tipografía editorial/técnica.

### Por qué Astro (y no Eleventy o Next.js estático)

- **Content Collections** dan validación de esquema "gratis" para el frontmatter de cada ruta —
  justo lo que se necesita para que agregar una ruta nueva sea un solo archivo, sin romper nada.
- **Islands architecture**: el perfil de elevación se renderiza como SVG estático en build time
  (sin librería de gráficos en el cliente); el mapa es la única isla interactiva real. Rendimiento
  alto sin sacrificar el mapa.
- **i18n nativo** (`astro.config.mjs` → `i18n`) encaja directo con el sitio bilingüe ES/EN sin
  añadir un framework de i18n aparte.
- Eleventy exigiría armar a mano la validación de contenido; Next.js estático añadiría el peso de
  React a páginas que son 95% contenido. Ninguno gana en mantenibilidad frente a Astro aquí.

## Estructura del proyecto

```
src/
  content/
    config.ts          # esquema (Zod) de la colección `rutas`
    rutas/
      es/*.md           # rutas en español (una por archivo)
      en/*.md           # su contraparte en inglés (mismo slug)
  components/           # Header, Footer, RouteHero, StatsBlock, RouteMap,
                         # ElevationProfile, Segments, Warnings, Recommendations,
                         # GpxCta, Gallery, RouteCard, RouteNav, SeoHead...
  layouts/BaseLayout.astro
  lib/
    gpx.ts               # parseo de GPX, distancia, desnivel, perfil de elevación
    i18n.ts              # diccionario de strings ES/EN
    seo.ts               # helpers de JSON-LD
  pages/
    index.astro, rutas/index.astro, rutas/[slug].astro, acerca.astro   # ES (default, sin prefijo)
    en/...                                                              # EN (mismo árbol, bajo /en)
  styles/global.css       # tokens de color (light/dark), tipografía, espaciado
public/
  gpx/*.gpx               # archivos GPX descargables (también fuente de los datos del mapa)
  photos/                 # imágenes de galería (placeholders de ejemplo incluidos)
_legacy-trail-analyzer/   # prototipo anterior del sitio, archivado (no se usa)
```

Para agregar una ruta nueva, ver **[HOW_TO_ADD_ROUTE.md](HOW_TO_ADD_ROUTE.md)**.

## Desarrollo local

```bash
npm install
npm run dev
```

Abre `http://localhost:4321`.

```bash
npm run build      # genera el sitio estático en dist/
npm run preview    # sirve dist/ localmente para probar el build de producción
```

## Antes de publicar

1. **Dominio real**: en `astro.config.mjs`, reemplaza `SITE_URL` (`https://tu-dominio.example`)
   por tu dominio real — lo usan el sitemap, las URLs canónicas y Open Graph.
2. **Contenido de ejemplo**: las 3 rutas incluidas son de ejemplo (una con GPX real de una
   travesía en Suiza, dos con GPX sintético). Su copy narrativo está marcado explícitamente como
   placeholder al final de cada crónica — bórralo cuando escribas la tuya. Ver
   [HOW_TO_ADD_ROUTE.md](HOW_TO_ADD_ROUTE.md).
3. **Fotos de galería**: son ilustraciones placeholder (`public/photos/placeholder-*.svg`).
   Reemplázalas por tus propias fotos. Las fotos de portada de las 3 rutas de ejemplo (las que
   se ven en el mosaico del home) sí son fotos reales con licencia libre (Wikimedia Commons,
   crédito en el caption de cada `gallery`) — puedes dejarlas como demo o reemplazarlas también.
4. **Avatar del autor**: `public/avatar.svg` es un placeholder con tu inicial. Reemplázalo por tu
   foto real (mismo nombre de archivo, o actualiza el `src` en `src/components/Header.astro`).
5. **Instagram**: el link a `instagram.com/hidelink` en el footer y en Acerca está hardcodeado en
   `src/components/Footer.astro` y `src/components/AboutPage.astro` — cámbialo por tu usuario.
6. **Deploy**: el sitio es 100% estático (`output: 'static'`, carpeta `dist/`) — funciona en
   Vercel, Netlify, Cloudflare Pages o GitHub Pages sin adapter ni configuración adicional más
   allá de apuntar el build command a `npm run build` y el output a `dist/`.

## Nota sobre la versión de Node / Astro

Este proyecto está fijado a **Astro 5.x** (no 6 o 7) a propósito: la versión de Node instalada en
esta máquina al momento de construir el sitio era 20.19.5, y desde Astro 6 el CLI exige Node
≥22.12 de forma estricta (no solo como advertencia). Astro 5.18 es la última línea que corre en
Node 20.

Esto deja pendientes un par de advisories de seguridad conocidos de Astro/esbuild/sharp
(`npm audit`) que ya están resueltos en Astro 7.1.3. En un sitio 100% estático con contenido de un
solo autor de confianza (sin input de usuarios en producción), el riesgo real es bajo — pero si
más adelante actualizas Node a ≥22.12, vale la pena correr:

```bash
npm install astro@latest @astrojs/sitemap@latest
```

y volver a probar `npm run build`.

## SEO

Cada página de ruta incluye: `<title>`/meta description por idioma, canonical, Open Graph
(incluyendo `og:locale:alternate` entre ES/EN), Twitter card, y JSON-LD tipo `Article` (se eligió
`Article` — y no un schema.org exótico tipo `TouristTrip` — porque es el tipo con soporte real de
indexación en buscadores). `@astrojs/sitemap` genera `sitemap-index.xml` automáticamente en el
build; `public/robots.txt` ya lo referencia.
