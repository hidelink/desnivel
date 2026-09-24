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

  let plan;
  try {
    plan = await req.json();
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

  const id = randomUUID().replace(/-/g, '').slice(0, 12);
  const store = getStore('shared-routes');
  await store.set(id, body, { metadata: { savedAt: new Date().toISOString() } });

  return json({ id });
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
