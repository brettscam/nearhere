/** Server-side OpenStreetMap helpers (run only in API routes, never the browser).
 *  Public OSM services reject/ratelimit browser calls; from the server we can
 *  set a proper User-Agent and there's no CORS. Every function fails soft. */

import type { POICategory } from "./types";

const UA = "Nearhere/1.0 (https://nearhere-six.vercel.app; roadtrip demo)";
const METERS_PER_MILE = 1609.344;

export interface Place {
  name: string;
  lat: number;
  lon: number;
  full?: string;
}

export interface NearbyFeature {
  id: string;
  name: string;
  category: POICategory;
  lat: number;
  lon: number;
  significance: number;
  tags: Record<string, string>;
}

async function fetchWithTimeout(url: string, opts: RequestInit = {}, ms = 15000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal, headers: { "User-Agent": UA, "Accept-Language": "en", ...(opts.headers || {}) } });
  } finally {
    clearTimeout(t);
  }
}

function coordFromString(q: string): Place | null {
  const m = q.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  return m ? { name: q, lat: parseFloat(m[1]), lon: parseFloat(m[2]) } : null;
}

function shortName(display?: string): string {
  if (!display) return "Unknown";
  return display.split(",").slice(0, 2).join(",").trim();
}

export async function geocode(query: string, limit = 5): Promise<Place[]> {
  const q = query.trim();
  if (!q) return [];
  const coord = coordFromString(q);
  if (coord) return [coord];
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=${limit}&q=${encodeURIComponent(q)}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (Array.isArray(data) ? data : []).map((h: any) => ({
      name: shortName(h.display_name),
      full: h.display_name,
      lat: parseFloat(h.lat),
      lon: parseFloat(h.lon),
    }));
  } catch {
    return [];
  }
}

export async function reverse(lat: number, lon: number): Promise<{ summary: string; region?: string; locality?: string }> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=12&addressdetails=1`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return { summary: "Somewhere out there" };
    const data = await res.json();
    const a = data.address ?? {};
    const region = a.state ?? a.region;
    const locality = a.city ?? a.town ?? a.village ?? a.hamlet ?? a.county ?? a.suburb;
    const summary = [locality, region].filter(Boolean).join(", ") || data.name || "Somewhere out there";
    return { summary, region, locality };
  } catch {
    return { summary: "Somewhere out there" };
  }
}

export interface RouteGeom {
  distanceMiles: number;
  durationText: string;
  coordinates: [number, number][]; // [lon, lat] along the route
}

export async function osrmRoute(a: Place, b: Place): Promise<RouteGeom | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=full&geometries=geojson`;
    const res = await fetchWithTimeout(url, {}, 15000);
    if (res.ok) {
      const data = await res.json();
      const r = data?.routes?.[0];
      if (r) {
        return {
          distanceMiles: r.distance / METERS_PER_MILE,
          durationText: fmtDuration(r.duration),
          coordinates: r.geometry?.coordinates ?? [[a.lon, a.lat], [b.lon, b.lat]],
        };
      }
    }
  } catch {
    /* fall through */
  }
  // Fallback: straight line, road-factor + 50mph estimate.
  const miles = haversineMiles(a, b) * 1.25;
  return { distanceMiles: miles, durationText: fmtDuration((miles / 50) * 3600), coordinates: [[a.lon, a.lat], [b.lon, b.lat]] };
}

const CATEGORY_TAGS: [string, POICategory][] = [
  ["geological", "geology"],
  ["natural:peak", "geology"],
  ["natural:volcano", "geology"],
  ["natural:cliff", "geology"],
  ["natural:hot_spring", "geology"],
  ["natural", "ecology"],
  ["waterway", "ecology"],
  ["historic:archaeological_site", "history"],
  ["historic:monument", "history"],
  ["historic:memorial", "history"],
  ["historic:fort", "military"],
  ["historic:battlefield", "military"],
  ["military", "military"],
  ["historic:ruins", "architecture"],
  ["historic:castle", "architecture"],
  ["historic", "history"],
  ["tourism:museum", "culture"],
  ["tourism:artwork", "culture"],
  ["tourism:gallery", "culture"],
  ["tourism:viewpoint", "ecology"],
  ["tourism:attraction", "culture"],
  ["tourism", "culture"],
  ["place", "history"],
];

function categorize(tags: Record<string, string>): POICategory {
  for (const [key, cat] of CATEGORY_TAGS) {
    const [k, v] = key.split(":");
    if (v ? tags[k] === v : tags[k] != null) return cat;
  }
  return "culture";
}

function significance(tags: Record<string, string>, hasName: boolean): number {
  let s = hasName ? 1.5 : 0;
  if (tags.wikipedia || tags.wikidata) s += 2;
  if (tags.heritage) s += 1;
  // experiences first — a famous waterfall should beat a nearby town
  if (tags.tourism === "attraction") s += 2.5;
  else if (tags.tourism === "viewpoint") s += 2;
  else if (tags.tourism === "museum") s += 1.6;
  if (tags.natural === "waterfall") s += 3;
  else if (tags.natural === "hot_spring") s += 2.2;
  else if (tags.natural === "volcano") s += 2;
  else if (tags.natural === "peak") s += 1.2;
  if (tags.geological) s += 1.6;
  if (tags.historic === "archaeological_site") s += 2;
  else if (tags.historic === "monument" || tags.historic === "memorial") s += 1.8;
  else if (tags.historic) s += 1.4;
  // towns/villages are context, not the headline
  if (tags.place) s -= 0.6;
  if (tags.tourism === "hotel" || tags.tourism === "camp_site" || tags.tourism === "information") s -= 2;
  return s;
}

/** Nearby named features around a point, ranked. Tries a mirror on failure. */
export async function overpassNearby(lat: number, lon: number, radiusMeters: number, limit = 40): Promise<NearbyFeature[]> {
  const r = Math.round(radiusMeters);
  const q =
    `[out:json][timeout:14];(` +
    `node["historic"](around:${r},${lat},${lon});` +
    `node["tourism"~"attraction|museum|artwork|viewpoint|gallery"](around:${r},${lat},${lon});` +
    `node["natural"~"peak|volcano|waterfall|hot_spring|spring|cliff|cave_entrance"](around:${r},${lat},${lon});` +
    `way["natural"~"water|cliff"]["name"](around:${r},${lat},${lon});` +
    `node["geological"](around:${r},${lat},${lon});` +
    `node["place"~"town|village|hamlet"](around:${r},${lat},${lon});` +
    `);out center 120;`;

  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ];
  for (const ep of endpoints) {
    try {
      const res = await fetchWithTimeout(ep, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(q),
      }, 15000);
      if (!res.ok) continue;
      const data = await res.json();
      const feats: NearbyFeature[] = (data.elements ?? [])
        .map((e: any) => {
          const flat = e.lat ?? e.center?.lat;
          const flon = e.lon ?? e.center?.lon;
          if (flat == null || flon == null) return null;
          const tags = e.tags ?? {};
          const name = tags.name;
          if (!name) return null; // named features only — they make real stories
          return {
            id: `${e.type}/${e.id}`,
            name,
            category: categorize(tags),
            lat: flat,
            lon: flon,
            significance: significance(tags, true),
            tags,
          } as NearbyFeature;
        })
        .filter(Boolean) as NearbyFeature[];
      // dedupe by name, rank by significance
      const seen = new Set<string>();
      const unique = feats.filter((f) => (seen.has(f.name) ? false : (seen.add(f.name), true)));
      unique.sort((a, b) => b.significance - a.significance);
      return unique.slice(0, limit);
    } catch {
      /* try next endpoint */
    }
  }
  return [];
}

/** Sample a route polyline (array of [lon,lat]) roughly every `intervalMiles`. */
export function sampleRoute(coords: [number, number][], intervalMiles: number, maxSamples = 12): { lat: number; lon: number }[] {
  if (coords.length === 0) return [];
  const pts: { lat: number; lon: number }[] = [{ lat: coords[0][1], lon: coords[0][0] }];
  let acc = 0;
  for (let i = 1; i < coords.length; i++) {
    const a = { lat: coords[i - 1][1], lon: coords[i - 1][0] };
    const b = { lat: coords[i][1], lon: coords[i][0] };
    acc += haversineMiles(a, b);
    if (acc >= intervalMiles) {
      pts.push(b);
      acc = 0;
    }
  }
  const last = coords[coords.length - 1];
  pts.push({ lat: last[1], lon: last[0] });
  // thin to maxSamples evenly
  if (pts.length <= maxSamples) return pts;
  const step = pts.length / maxSamples;
  const out: { lat: number; lon: number }[] = [];
  for (let i = 0; i < maxSamples; i++) out.push(pts[Math.floor(i * step)]);
  return out;
}

/** One Overpass query covering every sample point along a route. */
export async function overpassAlongRoute(points: { lat: number; lon: number }[], radiusMeters: number, limit = 60): Promise<NearbyFeature[]> {
  if (points.length === 0) return [];
  const r = Math.round(radiusMeters);
  const clauses = points
    .map(
      (p) =>
        `node["historic"]["name"](around:${r},${p.lat},${p.lon});` +
        `node["tourism"~"attraction|museum|viewpoint"]["name"](around:${r},${p.lat},${p.lon});` +
        `node["natural"~"peak|volcano|waterfall|hot_spring"]["name"](around:${r},${p.lat},${p.lon});`,
    )
    .join("");
  const q = `[out:json][timeout:18];(${clauses});out center 150;`;

  const endpoints = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
  for (const ep of endpoints) {
    try {
      const res = await fetchWithTimeout(ep, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(q),
      }, 15000);
      if (!res.ok) continue;
      const data = await res.json();
      const feats: NearbyFeature[] = (data.elements ?? [])
        .map((e: any) => {
          const flat = e.lat ?? e.center?.lat;
          const flon = e.lon ?? e.center?.lon;
          const tags = e.tags ?? {};
          if (flat == null || flon == null || !tags.name) return null;
          return { id: `${e.type}/${e.id}`, name: tags.name, category: categorize(tags), lat: flat, lon: flon, significance: significance(tags, true), tags } as NearbyFeature;
        })
        .filter(Boolean) as NearbyFeature[];
      const seen = new Set<string>();
      const unique = feats.filter((f) => (seen.has(f.name) ? false : (seen.add(f.name), true)));
      unique.sort((a, b) => b.significance - a.significance);
      return unique.slice(0, limit);
    } catch {
      /* next endpoint */
    }
  }
  return [];
}

// --- geometry helpers ---
export function fmtDuration(seconds: number): string {
  const min = Math.round(seconds / 60);
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
export function haversineMiles(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export { METERS_PER_MILE };
