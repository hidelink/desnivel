# Cómo agregar una ruta nueva

Cada ruta vive como **un archivo Markdown por idioma** en `src/content/rutas/es/` y
`src/content/rutas/en/`, más su archivo `.gpx` en `public/gpx/`. El GPX es la única fuente de
verdad para distancia, desnivel, altitud y el trazado del mapa — no los calcules a mano.

## 1. Consigue el `.gpx` de la ruta

Expórtalo de donde hayas grabado la ruta (reloj GPS, Strava, Komoot, SwitzerlandMobility, etc.)
y guárdalo en:

```
public/gpx/mi-ruta-nueva.gpx
```

Usa un nombre de archivo en kebab-case — va a ser también el `slug` de la ruta.

## 2. Crea el archivo en español

`src/content/rutas/es/mi-ruta-nueva.md`:

```markdown
---
slug: "mi-ruta-nueva"
titulo: "Título de la ruta"
subtitulo: "Una línea que resume el carácter de la ruta"
tipo: "trail running" # "trail running" | "hiking" | "travesía"
zona: "Región o cordillera"
ubicacion: "Punto de acceso más cercano"
fecha: 2026-03-15
distancia_km: 18 # referencia editorial — el valor real mostrado en el sitio se calcula del GPX
desnivel_m: 900 # ídem
altitud_max_m: 3200 # ídem
tiempo_estimado: "5-7 h"
dificultad: "alta" # "baja" | "media" | "alta" | "muy alta"
inicio: "Nombre del punto de inicio"
fin: "Nombre del punto final"
descripcion_corta: "1-2 frases para el <meta description> y las tarjetas de listado."
segmentos:
  - title: "Nombre del tramo"
    label: "Km 0 - 5"
    copy: "Qué se siente, qué se ve, qué cuidar en este tramo."
recomendaciones:
  - "Un consejo concreto."
advertencias:
  - "Un riesgo real de esta ruta específica."
clima_ideal: "Cuándo ir y por qué."
equipo_sugerido:
  - "Un objeto concreto."
agua_comida: "Dónde hay y dónde no hay abastecimiento."
gpx_url: "/gpx/mi-ruta-nueva.gpx"
strava_url: "https://strava.com/..." # opcional, bórralo si no aplica
instagram_url: "https://www.instagram.com/reel/..." # opcional — embebe un reel/post al final de la ruta
gallery:
  - src: "/photos/mi-ruta-nueva/1.jpg"
    alt: "Descripción de la foto"
    caption: "Opcional"
mapa: # opcional — solo para ajustar el encuadre inicial del mapa
  zoom: 12
perfil_elevacion: # opcional — solo para una nota editorial bajo el gráfico
  nota: "Un dato que quieras resaltar del perfil."
highlights:
  - "Un punto destacado de la ruta."
draft: false # ponlo en true para que no se publique todavía
---

Aquí va la crónica de la ruta — el cuerpo del archivo Markdown es la narrativa larga
("intro"), no un campo de frontmatter. Escribe como si se lo contaras a alguien que
va a intentar la ruta después que tú.
```

Todos los campos de frontmatter son los que definiste para el sitio; el esquema completo (y qué
es obligatorio vs. opcional) está en [`src/content/config.ts`](src/content/config.ts).

## 3. Traduce el archivo a inglés

Copia el mismo archivo a `src/content/rutas/en/mi-ruta-nueva.md` con el **mismo `slug`** y el
**mismo `gpx_url`**, pero con `titulo`, `subtitulo`, `descripcion_corta`, `segmentos[].*`,
`recomendaciones`, `advertencias`, `clima_ideal`, `equipo_sugerido`, `agua_comida`, `highlights` y
el cuerpo del Markdown traducidos al inglés.

Los campos `dificultad` y `tipo` se dejan **con el mismo valor en español** en ambos archivos
(son un enum fijo definido en el esquema) — el sitio los traduce automáticamente para mostrarlos
en inglés (ver `translateDifficulty` / `translateType` en `src/lib/i18n.ts`).

> Este proyecto no usa traducción automática en tiempo real ni APIs externas: la traducción se
> hace una sola vez, al agregar la ruta (puedes pedirle a Claude Code que la traduzca por ti), y
> queda guardada como contenido estático versionado — igual que el resto del sitio.

## 4. Agrega las fotos

Pon las fotos en `public/photos/mi-ruta-nueva/` y referencia sus rutas (`/photos/mi-ruta-nueva/1.jpg`)
en el campo `gallery` de ambos archivos (ES y EN pueden compartir las mismas fotos).

## 5. Verifica

```bash
npm run dev
```

Abre `/rutas/mi-ruta-nueva` y `/en/rutas/mi-ruta-nueva`. Revisa que:

- el mapa dibuje el trazado real de tu GPX (no un rectángulo vacío)
- el perfil de elevación no esté plano
- las estadísticas (distancia, desnivel, altitud) se vean razonables — si algo se ve raro,
  probablemente el GPX tiene puntos corruptos o un salto de coordenadas

La ruta aparece automáticamente en `/rutas` (ordenada por `fecha`, la más reciente primero) y en
la navegación anterior/siguiente de las demás rutas — no hay que registrarla en ningún otro lugar.

## 6. Publica

```bash
npm run build
```

Si el build pasa sin errores de Zod, el contenido es válido. Haz commit y push cuando quieras
publicar (ver el flujo de git del proyecto).
