import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { XMLParser } from 'fast-xml-parser';

// Public, no-auth endpoint: anyone with the app can create a shared route.
// Kept simple on purpose — a size cap is the only abuse guard for now.
const MAX_BYTES = 15 * 1024 * 1024; // 15MB, generous for even a dense 1Hz GPX

export const config = { path: '/api/save-route' };

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  // Logged-in callers send their Supabase access token — verify it ourselves
  // rather than trusting a client-supplied user id, so a route can only ever
  // be attributed to whoever actually holds that session.
  let userId = null;
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (token) {
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data?.user) userId = data.user.id;
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

  if (bodyText.length > MAX_BYTES) {
    return json({ error: 'La ruta es demasiado grande para compartir (máx 15MB).' }, 413);
  }

  const slug = slugify(plan.name) || 'ruta';
  const suffix = randomUUID().replace(/-/g, '').slice(0, 6);
  const id = `${slug}-${suffix}`;

  const location = await geocodeFirstPoint(plan.gpx);

  const { error } = await supabase.from('routes').insert({ id, plan, user_id: userId, location });
  if (error) {
    return json({ error: 'No se pudo guardar la ruta para compartir' }, 500);
  }

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

// First point of the track (trkpt, falling back to rtept/wpt like the
// client's own parser) — just enough to place the route on a map for
// geocoding, not a full parse.
function firstGpxPoint(gpx) {
  try {
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
    const doc = parser.parse(gpx);
    const root = doc?.gpx;
    if (!root) return null;
    const toArray = (v) => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);
    for (const trk of toArray(root.trk)) {
      for (const seg of toArray(trk.trkseg)) {
        for (const p of toArray(seg.trkpt)) {
          const lat = Number(p.lat), lon = Number(p.lon);
          if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
        }
      }
    }
    for (const p of toArray(root.rte?.rtept)) {
      const lat = Number(p.lat), lon = Number(p.lon);
      if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
    }
    for (const p of toArray(root.wpt)) {
      const lat = Number(p.lat), lon = Number(p.lon);
      if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
    }
  } catch {
    // malformed GPX — the client already validated this before upload, so
    // this is just a defensive fallback.
  }
  return null;
}

// "Ciudad, País" via Nominatim (OpenStreetMap) — free, no API key, but their
// usage policy asks for an identifying User-Agent and caps at ~1 req/sec,
// both fine here since this runs once per save, not per page view. Best
// effort: a saved route is never blocked on this, and a failure just means
// no location tag instead of a broken save.
async function geocodeFirstPoint(gpx) {
  const point = firstGpxPoint(gpx);
  if (!point) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${point.lat}&lon=${point.lon}&zoom=10&accept-language=es`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Desnivel/1.0 (https://desnivel.run)' },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address || {};
    const locality = addr.city || addr.town || addr.village || addr.municipality || addr.county || addr.state;
    if (!locality) return null;
    return addr.country ? `${locality}, ${addr.country}` : locality;
  } catch {
    return null;
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
