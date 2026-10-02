import { Resvg } from '@resvg/resvg-js';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { INTER_FONTS } from '../lib/inter-fonts.mjs';
import { loadPublicRoute, parseGpxPoints, measureRoute } from '../lib/route-data.mjs';

// /og/<route-id>.png — a per-route share card (route shape, elevation
// silhouette, name and key numbers), so a shared link previews as the
// actual route instead of the generic logo.
export const config = { path: '/og/*' };

const W = 1200, H = 630;
const ORANGE = '#e8650a';
const DIFF_COLORS = { 'Fácil': '#2f9e44', 'Moderada': '#d9930e', 'Difícil': '#e8650a', 'Extrema': '#e5483b' };

export default async (req) => {
  const url = new URL(req.url);
  const last = url.pathname.split('/').filter(Boolean).pop() || '';
  const id = decodeURIComponent(last).replace(/\.png$/i, '');

  const route = await loadPublicRoute(id);
  if (!route || !route.plan.gpx) return new Response('Not found', { status: 404 });

  let png;
  try {
    png = renderCard(route);
  } catch (err) {
    console.error('route-og-image failed', id, err);
    return new Response('Could not render', { status: 500 });
  }

  return new Response(png, {
    status: 200,
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=3600',
      'netlify-cdn-cache-control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
};

// resvg only loads fonts from file paths and a Lambda has no system fonts,
// so the embedded Inter files get written to /tmp once per cold start.
let fontFiles = null;
function ensureFonts() {
  if (fontFiles) return fontFiles;
  const dir = join(tmpdir(), 'desnivel-fonts');
  mkdirSync(dir, { recursive: true });
  fontFiles = Object.entries(INTER_FONTS).map(([weight, b64]) => {
    const file = join(dir, `Inter-${weight}.ttf`);
    if (!existsSync(file)) writeFileSync(file, Buffer.from(b64, 'base64'));
    return file;
  });
  return fontFiles;
}

function renderCard(route) {
  const svg = buildSvg(route);
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'original' },
    font: { fontFiles: ensureFonts(), loadSystemFonts: false, defaultFontFamily: 'Inter' },
  });
  return resvg.render().asPng();
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// The embedded font is a Latin subset, so anything outside it (emoji, other
// scripts) would render as nothing or as a box — drop those from the name.
function cleanText(s) {
  return String(s || '')
    .replace(/[^ -~ -ɏ‐-‧]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function wrapLines(text, maxChars, maxLines) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + ' ' + w).length <= maxChars) cur += ' ' + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S{0,3}$/, '') + '…';
  }
  return lines;
}

function buildSvg({ plan, location }) {
  const pts = parseGpxPoints(plan.gpx);
  const summary = plan.summary || {};
  const measured = measureRoute(pts);
  const dist = summary.dist && summary.dist !== '—' ? String(summary.dist).trim() : measured.km.toFixed(1);
  const gain = summary.gain && summary.gain !== '—' ? String(summary.gain).trim() : Math.round(measured.gain).toLocaleString('en-US');
  const diff = summary.diffLabel && DIFF_COLORS[summary.diffLabel] ? summary.diffLabel : '';

  const name = cleanText(plan.name || plan.filename?.replace(/\.gpx$/i, '')) || 'Ruta';
  const size = name.length <= 18 ? 70 : name.length <= 40 ? 54 : 42;
  const maxChars = Math.floor(560 / (size * 0.58));
  const lines = wrapLines(name, maxChars, 3);
  const lineH = Math.round(size * 1.12);
  const titleTop = 205;
  const nameSvg = lines.map((l, i) =>
    `<text x="64" y="${titleTop + size + i * lineH}" font-size="${size}" font-family="Inter ExtraBold" fill="#f4f2ee" letter-spacing="-1.5">${esc(l)}</text>`
  ).join('');
  const afterTitle = titleTop + size + (lines.length - 1) * lineH;

  const loc = cleanText(location);
  const locSvg = loc
    ? `<text x="64" y="${afterTitle + 44}" font-size="26" font-family="Inter Medium" fill="#a39d8e">${esc(loc.length > 44 ? loc.slice(0, 43) + '…' : loc)}</text>`
    : '';

  // Stats row, pinned to the bottom of the left column.
  const sy = 508;
  const statBlock = (x, value, unit) =>
    `<text x="${x}" y="${sy}" font-size="62" font-family="Inter ExtraBold" fill="#f4f2ee" letter-spacing="-1.5">${esc(value)}<tspan font-size="26" font-family="Inter Medium" fill="#a39d8e" dx="8" letter-spacing="0">${esc(unit)}</tspan></text>`;
  const distW = (dist.length * 36) + 70;
  const stats = statBlock(64, dist, 'km') + statBlock(64 + distW + 34, '+' + gain, 'm D+');
  const diffSvg = diff
    ? `<rect x="64" y="540" width="${diff.length * 15 + 40}" height="40" rx="20" fill="${DIFF_COLORS[diff]}" fill-opacity="0.18"/>
       <text x="${64 + (diff.length * 15 + 40) / 2}" y="567" font-size="21" font-family="Inter ExtraBold" fill="${DIFF_COLORS[diff]}" text-anchor="middle">${esc(diff)}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Inter">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#171717"/><stop offset="1" stop-color="#090909"/></linearGradient>
    <linearGradient id="route" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#ff8c3a"/><stop offset="1" stop-color="#e8650a"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <g stroke="#ffffff" stroke-opacity="0.045" stroke-width="1">
    <line x1="0" y1="157" x2="${W}" y2="157"/><line x1="0" y1="315" x2="${W}" y2="315"/><line x1="0" y1="472" x2="${W}" y2="472"/>
    <line x1="300" y1="0" x2="300" y2="${H}"/><line x1="600" y1="0" x2="600" y2="${H}"/><line x1="900" y1="0" x2="900" y2="${H}"/>
  </g>
  ${logoSvg(64, 60)}
  <text x="146" y="112" font-size="38" font-family="Inter ExtraBold" fill="#f4f2ee" letter-spacing="-1">Desni<tspan fill="${ORANGE}">vel</tspan></text>
  <rect x="640" y="48" width="512" height="534" rx="28" fill="#ffffff" fill-opacity="0.035" stroke="#ffffff" stroke-opacity="0.07"/>
  ${traceSvg(pts, 668, 76, 456, 340)}
  ${elevationSvg(pts, 668, 452, 456, 100)}
  ${nameSvg}
  ${locSvg}
  ${stats}
  ${diffSvg}
</svg>`;
}

function logoSvg(x, y) {
  return `<g transform="translate(${x},${y}) scale(0.1875)">
    <rect width="256" height="256" rx="56" fill="#141414" stroke="#ffffff" stroke-opacity="0.14" stroke-width="4"/>
    <path d="M 15 210 L 85 92 L 115 130 L 128 110 L 141 130 L 171 92 L 241 210 Z" fill="#1f1f1f"/>
    <path d="M 26 195 C 40 194,54 192,65 181 C 76 170,81 154,89 140 C 97 126,106 115,114 104 C 120 95,125 86,128 76 C 131 86,134 95,140 104 C 148 115,158 128,168 144 C 178 160,187 175,200 185 C 212 193,223 195,231 196" fill="none" stroke="url(#route)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="128" cy="76" r="8" fill="#ff8c3a"/>
  </g>`;
}

// Route shape, projected with cos(lat) so it isn't stretched, fitted and
// centred in the box.
function traceSvg(pts, bx, by, bw, bh) {
  if (pts.length < 2) return '';
  const lats = pts.map((p) => p.lat), lons = pts.map((p) => p.lon);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const k = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);
  const w = Math.max((maxLon - minLon) * k, 1e-9), h = Math.max(maxLat - minLat, 1e-9);
  const pad = 22;
  const scale = Math.min((bw - 2 * pad) / w, (bh - 2 * pad) / h);
  const ox = bx + (bw - w * scale) / 2, oy = by + (bh - h * scale) / 2;
  const xy = pts.map((p) => [ox + (p.lon - minLon) * k * scale, oy + (maxLat - p.lat) * scale]);
  const d = xy.map((c, i) => `${i ? 'L' : 'M'}${c[0].toFixed(1)},${c[1].toFixed(1)}`).join('');
  const [sx, sy] = xy[0], [ex, ey] = xy[xy.length - 1];
  const end = Math.hypot(ex - sx, ey - sy) > 14
    ? `<circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="9" fill="#fff" stroke="#0b0b0b" stroke-width="4"/>`
    : '';
  return `<path d="${d}" fill="none" stroke="${ORANGE}" stroke-opacity="0.28" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${d}" fill="none" stroke="url(#route)" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="9" fill="#fff" stroke="#4fc3f7" stroke-width="4"/>
  ${end}`;
}

// Elevation silhouette; x is distance covered, so steep and flat stretches
// keep their real proportions.
function elevationSvg(pts, bx, by, bw, bh) {
  const eles = pts.map((p) => p.ele);
  if (pts.length < 2 || !eles.every(Number.isFinite)) return '';
  const minE = Math.min(...eles), maxE = Math.max(...eles), range = maxE - minE;
  if (range < 5) return '';
  const k = Math.cos(((pts[0].lat + pts[pts.length - 1].lat) / 2) * Math.PI / 180);
  const dist = [0];
  for (let i = 1; i < pts.length; i++) {
    const dy = pts[i].lat - pts[i - 1].lat, dx = (pts[i].lon - pts[i - 1].lon) * k;
    dist.push(dist[i - 1] + Math.hypot(dx, dy));
  }
  const total = dist[dist.length - 1] || 1;
  const pad = 6;
  const ep = pts.map((p, i) => [bx + (dist[i] / total) * bw, by + bh - pad - ((p.ele - minE) / range) * (bh - 2 * pad)]);
  const line = ep.map((c, i) => `${i ? 'L' : 'M'}${c[0].toFixed(1)},${c[1].toFixed(1)}`).join('');
  return `<path d="${line}L${bx + bw},${by + bh}L${bx},${by + bh}Z" fill="${ORANGE}" fill-opacity="0.18"/>
  <path d="${line}" fill="none" stroke="${ORANGE}" stroke-width="3" stroke-linejoin="round"/>`;
}
