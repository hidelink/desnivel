# Panel de administración (Sveltia CMS)

El sitio incluye un panel visual en **`/admin`** para agregar y editar rutas sin tocar
código — hecho con [Sveltia CMS](https://github.com/sveltia/sveltia-cms), que guarda todo
como los mismos archivos Markdown que ya usa el sitio (no hay base de datos aparte).

## Opción 1 — Probarlo ahora mismo, sin configurar nada

1. Corre el sitio localmente: `npm run dev`
2. Abre `http://localhost:4321/admin/index.html`
3. Haz clic en **"Work with Local Repository"** y selecciona la carpeta del proyecto
   (`desnivel/`) cuando el navegador te lo pida (funciona en Chrome/Edge; necesita la
   File System Access API).
4. Edita/agrega rutas con el formulario visual — los cambios se escriben directo en
   `src/content/rutas/...`, `public/gpx/` y `public/photos/`.
5. Cuando termines, haces `git add`, `git commit`, `git push` tú mismo (o me pides a mí
   que lo haga) — el CMS local no hace commit automático.

Esto ya funciona hoy, sin desplegar nada ni crear cuentas.

## Opción 2 — Panel en producción, con login de GitHub (`/admin` en tu dominio real)

Para que `/admin` funcione desde cualquier lugar (no solo tu compu) y guarde los cambios
directo en GitHub (con commit automático), necesitas 3 cosas — todas requieren tu cuenta,
así que estos pasos los haces tú:

### 1. Desplegar el sitio en Netlify

1. Entra a [netlify.com](https://www.netlify.com) y crea una cuenta (o inicia sesión).
2. **Add new site → Import an existing project** → conecta tu cuenta de GitHub →
   selecciona el repo `hidelink/desnivel`.
3. Build command: `npm run build` — Publish directory: `dist` (Netlify detecta esto
   automáticamente para Astro, pero verifícalo).
4. Deploy. En unos minutos tendrás una URL tipo `https://algo-random.netlify.app`
   (puedes conectar tu propio dominio después desde Site settings → Domain management).

### 2. Activar el proveedor de OAuth para GitHub

Esto es lo que permite que el botón "Sign In with GitHub" del CMS funcione:

1. En el dashboard de tu sitio en Netlify, busca **Site configuration → General →
   Integrations** (o "Build & deploy" en versiones más viejas del panel) y busca la
   sección de **acceso a repositorios Git / "Git-based CMS" / OAuth**. El nombre exacto
   del menú cambia de vez en cuando en Netlify — si no lo encuentras a la primera, busca
   "OAuth" en el buscador de configuración del sitio, o revisa la documentación actual de
   Netlify para "Git Gateway" / "OAuth provider for Git-based CMS".
2. Instala/activa el proveedor para **GitHub**.

### 3. Confirmar que tu cuenta de GitHub tiene acceso de escritura al repo

Como el CMS usa el backend `github` directo (ver `public/admin/config.yml`), **quien
puede iniciar sesión y guardar cambios es exactamente quien tiene permiso de escritura
sobre el repo `hidelink/desnivel` en GitHub** — no hay un sistema de usuarios aparte que
mantener. Si el repo ya es tuyo, ya tienes acceso; no necesitas hacer nada más aquí.

### Listo

Con esto, entrar a `https://tu-sitio.netlify.app/admin` (o `https://tu-dominio.com/admin`
una vez conectes tu dominio) te muestra el mismo panel, das clic en "Sign In with
GitHub", autorizas una vez, y cada ruta que agregues o edites ahí hace commit
automáticamente al repo — lo que dispara un redeploy en Netlify solo.

## ¿Qué pasa con Vercel?

Si en algún momento prefieres Vercel en vez de Netlify, el CMS sigue funcionando, pero
el paso 2 cambia: en vez del proveedor de OAuth integrado de Netlify, necesitas desplegar
tú mismo un pequeño proxy de OAuth (una función serverless) — hay plantillas listas para
esto, pero es una pieza extra que mantener. Por eso Netlify es la opción recomendada
mientras uses este CMS.
