# Panel de administración (Decap CMS)

El sitio incluye un panel visual en **`/admin`** para agregar y editar rutas sin tocar
código — hecho con [Decap CMS](https://decapcms.org) (el sucesor de Netlify CMS), que
guarda todo como los mismos archivos Markdown que ya usa el sitio (no hay base de datos
aparte).

## Opción 1 — Probarlo ahora mismo, sin configurar nada

1. Corre el sitio localmente: `npm run dev`
2. Abre `http://localhost:4321/admin/index.html`
3. Verás una pantalla de login de Netlify Identity — esta opción de "sin configurar nada"
   solo funciona bien con backends locales; para editar de verdad usa la Opción 2 una vez
   desplegado, o pídeme a mí que edite los archivos directamente en esta sesión.

## Opción 2 — Panel en producción, con Netlify Identity + Git Gateway

Ya hiciste la parte más importante: conectaste el repo a tu sitio en Netlify y activaste
**Git Gateway** (lo vimos en tu captura — repo `hidelink/desnivel` vinculado). El CMS ya
está configurado para usar exactamente eso (`backend: git-gateway` en
`public/admin/config.yml`). Solo faltan estos 2 pasos, ambos en el dashboard de Netlify:

### 1. Confirmar que Identity está activo

Git Gateway depende de **Netlify Identity** (la sección justo arriba de Git Gateway en tu
dashboard). Si no la activaste explícitamente, actívala ahí — es donde Netlify guarda los
"usuarios" que pueden iniciar sesión en el CMS.

### 2. Agregarte a ti mismo como usuario

Como Identity es un sistema de usuarios aparte de tu cuenta de Netlify:

1. En la pestaña **Identity** del dashboard de tu sitio, busca **Invite users** e
   invítate con tu propio correo.
2. Revisa tu correo y confirma la invitación (te va a pedir crear una contraseña para
   este login específico del sitio).
3. Importante — en **Identity → Settings → Registration**, cámbialo a **"Invite only"**
   (no "Open") para que nadie más pueda registrarse solo y obtener acceso de escritura a
   tu repo.

### Listo

Con esto, entra a `https://desnivel.run/admin`, dale clic a **"Login with Netlify
Identity"**, inicia sesión con la cuenta que invitaste, y cada ruta que agregues o edites
ahí hace commit automáticamente al repo — lo que dispara un redeploy en Netlify solo.

## ¿Qué pasa con Vercel?

Git Gateway es una función específica de Netlify — no existe un equivalente igual de
simple en Vercel. Si en algún momento cambias de hosting, el CMS necesitaría reconfigurarse
para usar el backend `github` directo más un proxy de OAuth propio (más piezas que
mantener). Por eso, mientras uses este CMS, Netlify es la opción más simple.
