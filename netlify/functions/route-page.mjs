import { loadPublicRoute } from '../lib/route-data.mjs';

// /r/<route-id> — serves the same analyzer page as before, but with this
// route's own title, description and preview image in the <head>. The page
// is otherwise static (identical bytes for every route), and link-preview
// crawlers don't run JavaScript, so without this every shared link would
// preview as the generic site card. The analyzer still reads the route id
// back out of location.pathname client-side, exactly as it did when this
// path was a plain rewrite to "/".
export const config = { path: '/r/*' };

export default async (req) => {
  const url = new URL(req.url);
  const origin = url.origin;

  let html;
  try {
    const res = await fetch(`${origin}/`, { headers: { accept: 'text/html' } });
    if (!res.ok) throw new Error(`index fetch ${res.status}`);
    html = await res.text();
  } catch (err) {
    console.error('route-page: could not load the base page', err);
    return new Response('Service unavailable', { status: 502 });
  }

  // Whatever goes wrong below, the viewer still gets the working analyzer
  // (it loads the route itself); only the preview falls back to generic.
  let body = html;
  let cacheable = false;
  try {
    const id = decodeURIComponent(url.pathname.split('/').filter(Boolean)[1] || '');
    const route = await loadPublicRoute(id);
    if (route) {
      body = withRouteMeta(html, { id, origin, plan: route.plan, location: route.location });
      cacheable = true;
    }
  } catch (err) {
    console.error('route-page: could not build route meta', err);
  }

  const headers = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, must-revalidate' };
  if (cacheable) headers['netlify-cdn-cache-control'] = 'public, s-maxage=300, stale-while-revalidate=3600';
  return new Response(body, { status: 200, headers });
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function withRouteMeta(html, { id, origin, plan, location }) {
  const name = String(plan.name || plan.filename?.replace(/\.gpx$/i, '') || 'Ruta').trim();
  const s = plan.summary || {};
  const facts = [
    s.dist && s.dist !== '—' ? `${s.dist} km` : null,
    s.gain && s.gain !== '—' ? `+${s.gain} m D+` : null,
    s.diffLabel && s.diffLabel !== '—' ? s.diffLabel : null,
    location,
  ].filter(Boolean).join(' · ');
  const title = `${name} · Desnivel`;
  const description = `${facts ? facts + '. ' : ''}Mira el mapa, la altimetría y descarga el GPX en Desnivel.`;
  const pageUrl = `${origin}/r/${encodeURIComponent(id)}`;
  const image = `${origin}/og/${encodeURIComponent(id)}.png`;

  const tags = {
    title: `<title>${esc(title)}</title>`,
    description: `<meta name="description" content="${esc(description)}">`,
    canonical: `<link rel="canonical" href="${esc(pageUrl)}">`,
    ogTitle: `<meta property="og:title" content="${esc(name)}">`,
    ogDescription: `<meta property="og:description" content="${esc(description)}">`,
    ogUrl: `<meta property="og:url" content="${esc(pageUrl)}">`,
    ogImage: `<meta property="og:image" content="${esc(image)}">`,
    twTitle: `<meta name="twitter:title" content="${esc(name)}">`,
    twDescription: `<meta name="twitter:description" content="${esc(description)}">`,
    twImage: `<meta name="twitter:image" content="${esc(image)}">`,
  };

  let out = html;
  out = swap(out, /<title>[^<]*<\/title>/, tags.title);
  out = swap(out, /<meta name="description" content="[^"]*">/, tags.description);
  out = swap(out, /<link rel="canonical" href="[^"]*">/, tags.canonical);
  out = swap(out, /<meta property="og:title" content="[^"]*">/, tags.ogTitle);
  out = swap(out, /<meta property="og:description" content="[^"]*">/, tags.ogDescription);
  out = swap(out, /<meta property="og:url" content="[^"]*">/, tags.ogUrl);
  out = swap(out, /<meta property="og:image" content="[^"]*">/, tags.ogImage);
  out = swap(out, /<meta name="twitter:title" content="[^"]*">/, tags.twTitle);
  out = swap(out, /<meta name="twitter:description" content="[^"]*">/, tags.twDescription);
  out = swap(out, /<meta name="twitter:image" content="[^"]*">/, tags.twImage);
  // Stated up front so crawlers don't have to download the image to size the card.
  out = out.replace('</head>', '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"></head>');
  return out;
}

// Replace the generic tag when the page has it; otherwise add it, so a
// missing tag in the base page can never silently drop part of the preview.
function swap(html, pattern, tag) {
  return pattern.test(html) ? html.replace(pattern, () => tag) : html.replace('</head>', () => `${tag}</head>`);
}
