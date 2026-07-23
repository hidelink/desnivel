import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { XMLParser } from 'fast-xml-parser';

export interface TrackPoint {
  lat: number;
  lon: number;
  ele: number;
}

export interface Bounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export interface AxisTick {
  pos: number;
  label: string;
}

export interface ElevationProfileSvg {
  linePath: string;
  areaPath: string;
  minEleM: number;
  maxEleM: number;
  width: number;
  height: number;
  chartLeft: number;
  chartRight: number;
  chartBottom: number;
  xTicks: AxisTick[];
  yTicks: AxisTick[];
}

export interface GpxData {
  points: TrackPoint[];
  mapTrack: [number, number][];
  distanceKm: number;
  elevationGainM: number;
  elevationLossM: number;
  minEleM: number;
  maxEleM: number;
  bounds: Bounds;
  center: [number, number];
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function haversineMeters(a: TrackPoint, b: TrackPoint): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Reads a .gpx file from /public (build-time only, Node fs) and parses its track points. */
function readTrackPoints(publicGpxPath: string): TrackPoint[] {
  const filePath = join(process.cwd(), 'public', publicGpxPath.replace(/^\//, ''));
  const xml = readFileSync(filePath, 'utf-8');
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
  const doc = parser.parse(xml);
  const gpxRoot = doc.gpx;
  if (!gpxRoot) throw new Error(`GPX inválido o vacío: ${publicGpxPath}`);

  const points: TrackPoint[] = [];
  for (const trk of toArray(gpxRoot.trk)) {
    for (const seg of toArray(trk.trkseg)) {
      for (const p of toArray(seg.trkpt)) {
        const lat = Number(p.lat);
        const lon = Number(p.lon);
        const ele = Number(p.ele ?? 0);
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          points.push({ lat, lon, ele: Number.isFinite(ele) ? ele : 0 });
        }
      }
    }
  }
  if (points.length < 2) {
    throw new Error(`El GPX ${publicGpxPath} no tiene suficientes puntos de track.`);
  }
  return points;
}

/** Decimates a track to at most `maxPoints`, always keeping the first and last point. */
function decimate(points: TrackPoint[], maxPoints: number): TrackPoint[] {
  if (points.length <= maxPoints) return points;
  const step = points.length / maxPoints;
  const out: TrackPoint[] = [];
  for (let i = 0; i < maxPoints; i++) {
    out.push(points[Math.floor(i * step)]);
  }
  out.push(points[points.length - 1]);
  return out;
}

const NOISE_THRESHOLD_M = 1.5;

/** Loads and analyzes a GPX track: distance, elevation gain/loss, bounds, decimated map track. */
export function loadGpx(publicGpxPath: string): GpxData {
  const points = readTrackPoints(publicGpxPath);

  let distanceM = 0;
  let gain = 0;
  let loss = 0;
  let minEle = points[0].ele;
  let maxEle = points[0].ele;
  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLon = points[0].lon;
  let maxLon = points[0].lon;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    distanceM += haversineMeters(prev, curr);

    const diff = curr.ele - prev.ele;
    if (diff > NOISE_THRESHOLD_M) gain += diff;
    if (diff < -NOISE_THRESHOLD_M) loss += Math.abs(diff);

    if (curr.ele < minEle) minEle = curr.ele;
    if (curr.ele > maxEle) maxEle = curr.ele;
    if (curr.lat < minLat) minLat = curr.lat;
    if (curr.lat > maxLat) maxLat = curr.lat;
    if (curr.lon < minLon) minLon = curr.lon;
    if (curr.lon > maxLon) maxLon = curr.lon;
  }

  const mapTrack = decimate(points, 600).map((p): [number, number] => [p.lat, p.lon]);

  return {
    points,
    mapTrack,
    distanceKm: Math.round((distanceM / 1000) * 10) / 10,
    elevationGainM: Math.round(gain),
    elevationLossM: Math.round(loss),
    minEleM: Math.round(minEle),
    maxEleM: Math.round(maxEle),
    bounds: { minLat, maxLat, minLon, maxLon },
    center: [(minLat + maxLat) / 2, (minLon + maxLon) / 2],
  };
}

function niceStep(range: number, candidates: number[]): number {
  for (const s of candidates) {
    if (range / s <= 5) return s;
  }
  return candidates[candidates.length - 1];
}

/** Builds a static SVG line+area path for the elevation profile, sampled at build time,
 *  plus axis ticks (distance in km, altitude in m) so the chart reads on its own. */
export function buildElevationProfile(
  points: TrackPoint[],
  opts: { width?: number; height?: number; samples?: number } = {}
): ElevationProfileSvg {
  const width = opts.width ?? 960;
  const height = opts.height ?? 240;
  const samples = opts.samples ?? 140;

  const padLeft = 46;
  const padRight = 10;
  const padTop = 14;
  const padBottom = 26;
  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  // cumulative distance per point, to sample evenly along the route (not per raw GPS point)
  const cum: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    cum.push(cum[i - 1] + haversineMeters(points[i - 1], points[i]));
  }
  const totalM = cum[cum.length - 1] || 1;
  const totalKm = totalM / 1000;

  const minEle = Math.min(...points.map((p) => p.ele));
  const maxEle = Math.max(...points.map((p) => p.ele));
  const eleRange = Math.max(maxEle - minEle, 1);

  const sampled: number[] = [];
  let cursor = 0;
  for (let s = 0; s <= samples; s++) {
    const targetDist = (s / samples) * totalM;
    while (cursor < cum.length - 2 && cum[cursor + 1] < targetDist) cursor++;
    sampled.push(points[cursor].ele);
  }

  const eleToY = (ele: number) => padTop + innerH - ((ele - minEle) / eleRange) * innerH;

  const coords = sampled.map((ele, i) => {
    const x = padLeft + (i / samples) * innerW;
    return [x, eleToY(ele)] as [number, number];
  });

  const linePath = coords
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');

  const chartBottom = padTop + innerH;
  const areaPath = `${linePath} L ${(padLeft + innerW).toFixed(1)} ${chartBottom.toFixed(1)} L ${padLeft.toFixed(
    1
  )} ${chartBottom.toFixed(1)} Z`;

  const kmStep = niceStep(totalKm, [1, 2, 5, 10, 20, 25, 50, 100]);
  const xTicks: AxisTick[] = [];
  for (let km = 0; km <= totalKm + 0.001; km += kmStep) {
    xTicks.push({ pos: padLeft + (km / totalKm) * innerW, label: `${Math.round(km)} km` });
  }

  const eleStep = niceStep(eleRange, [25, 50, 100, 200, 250, 500, 1000, 2000]);
  const yTicks: AxisTick[] = [];
  for (let ele = Math.ceil(minEle / eleStep) * eleStep; ele <= maxEle; ele += eleStep) {
    yTicks.push({ pos: eleToY(ele), label: `${Math.round(ele)} m` });
  }

  return {
    linePath,
    areaPath,
    minEleM: Math.round(minEle),
    maxEleM: Math.round(maxEle),
    width,
    height,
    chartLeft: padLeft,
    chartRight: width - padRight,
    chartBottom,
    xTicks,
    yTicks,
  };
}
