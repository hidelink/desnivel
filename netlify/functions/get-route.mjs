import { createClient } from '@supabase/supabase-js';

export const config = { path: '/api/get-route' };

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async (req) => {
  const url = new URL(req.url);
  const id = url.searchParams.get('id') || '';

  // slug-suffix shape, e.g. "gornergrat-4f8a2c" — also accepts the older
  // plain hex ids from before route names were slugified into the link.
  if (!/^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/i.test(id)) {
    return json({ error: 'ID inválido' }, 400);
  }

  const { data, error } = await supabase
    .from('routes')
    .select('plan, is_hidden')
    .eq('id', id)
    .maybeSingle();

  if (error || !data || data.is_hidden) {
    return json({ error: 'No encontramos esa ruta compartida. El link puede estar mal escrito.' }, 404);
  }

  // Fire-and-forget: don't make the viewer wait on the counter, and don't
  // fail the response if it errors.
  supabase.rpc('increment_route_views', { route_id: id }).then(() => {}, () => {});

  return new Response(JSON.stringify(data.plan), {
    status: 200,
    // Every view must reach the function to count, so this can't be cached
    // the way the old Blobs-backed response was.
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
