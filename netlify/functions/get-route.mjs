import { createClient } from '@supabase/supabase-js';
import { isValidRouteId, loadPublicRoute } from '../lib/route-data.mjs';

export const config = { path: '/api/get-route' };

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async (req) => {
  const url = new URL(req.url);
  const key = url.searchParams.get('id') || '';

  if (!isValidRouteId(key)) {
    return json({ error: 'ID inválido' }, 400);
  }

  // `key` is whatever was in the link: the permanent id or the owner's custom
  // slug. The real id comes back in a header so the page can keep using it
  // for renames and saves, which are always keyed by id.
  const route = await loadPublicRoute(key);
  if (!route) {
    return json({ error: 'No encontramos esa ruta compartida. El link puede estar mal escrito.' }, 404);
  }

  // Fire-and-forget: don't make the viewer wait on the counter, and don't
  // fail the response if it errors.
  supabase.rpc('increment_route_views', { route_id: route.id }).then(() => {}, () => {});

  return new Response(JSON.stringify(route.plan), {
    status: 200,
    // Every view must reach the function to count, so this can't be cached
    // the way the old Blobs-backed response was.
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-route-id': route.id },
  });
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
