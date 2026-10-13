import { createClient } from '@supabase/supabase-js';
import { XMLParser } from 'fast-xml-parser';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// slug-suffix shape, e.g. "gornergrat-4f8a2c" — also accepts the older
// plain hex ids from before route names were slugified into the link.
export function isValidRouteId(id) {
  return /^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/i.test(id || '');
}

// A link can carry either the permanent id or the owner's custom slug (see
// routes.slug in schema.sql); both reach the same route. The id wins if one
// string were ever both — the database refuses to let that happen anyway.
// A hidden or missing route is simply "not found", so nothing about it
// leaks into a link preview or an API response.
export async function loadPublicRoute(key) {
  if (!isValidRouteId(key)) return null;
  // `key` passed the strict [a-z0-9-] check above, so it is safe inside the filter.
  let { data, error } = await supabase
    .from('routes')
    .select('id, slug, plan, is_hidden, location')
    .or(`id.eq.${key},slug.eq.${key}`)
    .limit(2);
  if (error) {
    // Slug column not there yet (code deployed before the SQL ran): behave
    // exactly like before and resolve by id only.
    ({ data, error } = await supabase
      .from('routes')
      .select('id, plan, is_hidden, location')
      .eq('id', key)
      .limit(1));
  }
  if (error || !data || !data.length) return null;
  const row = data.find((r) => r.id === key) || data[0];
  if (row.is_hidden) return null;
  return { id: row.id, slug: row.slug || null, plan: row.plan || {}, location: row.location || null };
}

const toArray = (v) => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);

// Track points as {lat, lon, ele} (trkpt, falling back to rtept like the
// client's own parser), downsampled to at most `max` — a preview image
// doesn't need every GPS sample, and this keeps big files cheap to draw.
export function parseGpxPoints(gpx, max = 160) {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
  const root = parser.parse(gpx)?.gpx;
  if (!root) return [];
  let raw = [];
  for (const trk of toArray(root.trk)) {
    for (const seg of toArray(trk.trkseg)) raw.push(...toArray(seg.trkpt));
  }
  if (!raw.length) raw = toArray(root.rte?.rtept);
  const all = [];
  for (const p of raw) {
    const lat = Number(p.lat), lon = Number(p.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const ele = p.ele === undefined ? NaN : Number(p.ele);
    all.push({ lat, lon, ele });
  }
  if (all.length < 2) return all;
  const step = Math.max(1, Math.floor(all.length / max));
  const pts = all.filter((_, i) => i % step === 0);
  if (pts[pts.length - 1] !== all[all.length - 1]) pts.push(all[all.length - 1]);
  return pts;
}

// Distance (km) and elevation gain (m) from the points, for routes whose
// saved summary is missing. Gain over the downsampled points slightly
// under-counts jitter, which is fine for a preview-only fallback.
export function measureRoute(pts) {
  let km = 0, gain = 0;
  for (let i = 1; i < pts.length; i++) {
    km += haversineKm(pts[i - 1], pts[i]);
    const de = pts[i].ele - pts[i - 1].ele;
    if (Number.isFinite(de) && de > 0) gain += de;
  }
  return { km, gain };
}

function haversineKm(a, b) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
