import { getStore } from '@netlify/blobs';
import { randomUUID } from 'node:crypto';

// Public, no-auth endpoint: anyone with the app can create a shared route.
// Kept simple on purpose — a size cap is the only abuse guard for now.
const MAX_BYTES = 15 * 1024 * 1024; // 15MB, generous for even a dense 1Hz GPX

export const config = { path: '/api/save-route' };

export default async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'JSON inválido' }, 400);
  }

  // The gzipped plan travels as base64 inside plain JSON — sending it as a
  // raw binary request body got corrupted somewhere in Netlify's Lambda-
  // compatible request handling before the function ever saw it. Base64
  // text has no binary/text ambiguity left for anything upstream to get
  // wrong.
  let bodyText;
  try {
    if (typeof payload?.gzipBase64 === 'string') {
      const compressed = Buffer.from(payload.gzipBase64, 'base64');
      bodyText = await new Response(
        new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))
      ).text();
    } else {
      // Back-compat: a plan posted directly, uncompressed.
      bodyText = JSON.stringify(payload);
    }
  } catch {
    return json({ error: 'No se pudo leer el cuerpo de la petición' }, 400);
  }

  let plan;
  try {
    plan = JSON.parse(bodyText);
  } catch {
    return json({ error: 'JSON inválido' }, 400);
  }

  if (!plan || plan.type !== 'desnivel-route-plan' || typeof plan.gpx !== 'string' || !plan.gpx.length) {
    return json({ error: 'Plan de ruta inválido' }, 400);
  }

  const body = JSON.stringify(plan);
  if (body.length > MAX_BYTES) {
    return json({ error: 'La ruta es demasiado grande para compartir (máx 15MB).' }, 413);
  }

  const slug = slugify(plan.name) || 'ruta';
  const suffix = randomUUID().replace(/-/g, '').slice(0, 6);
  const id = `${slug}-${suffix}`;
  const store = getStore('shared-routes');
  await store.set(id, body, { metadata: { savedAt: new Date().toISOString() } });

  return json({ id });
};

// Route name -> URL-safe slug: lowercase, no accents, words joined by
// hyphens. The random suffix appended by the caller is what actually
// guarantees uniqueness — this just makes the link readable at a glance
// (…/?r=gornergrat-4f8a2c instead of …/?r=5cda6a075006).
function slugify(text) {
  return String(text || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
