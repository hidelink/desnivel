import { getStore } from '@netlify/blobs';

export const config = { path: '/api/get-route' };

export default async (req) => {
  const url = new URL(req.url);
  const id = url.searchParams.get('id') || '';

  // slug-suffix shape, e.g. "gornergrat-4f8a2c" — also accepts the older
  // plain hex ids from before route names were slugified into the link.
  if (!/^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/i.test(id)) {
    return json({ error: 'ID inválido' }, 400);
  }

  const store = getStore('shared-routes');
  const data = await store.get(id);
  if (!data) {
    return json({ error: 'No encontramos esa ruta compartida. El link puede estar mal escrito.' }, 404);
  }

  return new Response(data, {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=3600' },
  });
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
