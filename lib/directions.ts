/** Google-Maps-style directions helpers for Trip Setup.
 *  - geocode a place name → coordinate (OSM Nominatim, no key)
 *  - route between two coordinates → distance + drive time (OSRM demo, no key)
 *  - parse a pasted Google Maps URL → origin / destination
 *  All browser-friendly and key-free; graceful fallbacks when a service is down. */

export interface Place {
  name: string;
  lat: number;
  lon: number;
}

export interface RouteResult {
  distanceMiles: number;
  durationText: string; // "4h 20m"
}

const METERS_PER_MILE = 1609.344;

export async function geocodePlace(query: string): Promise<Place | null> {
  const q = query.trim();
  if (!q) return null;
  // Already a "lat,lon"?
  const m = q.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (m) return { name: q, lat: parseFloat(m[1]), lon: parseFloat(m[2]) };
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { "Accept-Language": "en" } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const hit = data[0];
    return { name: shortName(hit.display_name ?? q), lat: parseFloat(hit.lat), lon: parseFloat(hit.lon) };
  } catch {
    return null;
  }
}

export async function routeBetween(a: Place, b: Place): Promise<RouteResult> {
  // OSRM demo server: distance (m) + duration (s) for driving.
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const r = data?.routes?.[0];
      if (r) return { distanceMiles: r.distance / METERS_PER_MILE, durationText: fmtDuration(r.duration) };
    }
  } catch {
    /* fall through to estimate */
  }
  // Fallback: straight-line distance × 1.25 road factor, ~50 mph.
  const miles = haversineMiles(a, b) * 1.25;
  return { distanceMiles: miles, durationText: fmtDuration((miles / 50) * 3600) };
}

/** Extract origin/destination from a pasted Google/Apple Maps URL or text. */
export function parseMapsUrl(input: string): { from?: string; to?: string } {
  const s = input.trim();
  try {
    // google.com/maps/dir/ORIGIN/DESTINATION/...
    const dir = s.match(/\/maps\/dir\/([^/]+)\/([^/@]+)/);
    if (dir) return { from: decodeURIComponent(dir[1].replace(/\+/g, " ")), to: decodeURIComponent(dir[2].replace(/\+/g, " ")) };

    const url = new URL(s);
    // ?saddr= & daddr=  or  ?origin= & destination=
    const from = url.searchParams.get("saddr") ?? url.searchParams.get("origin") ?? undefined;
    const to = url.searchParams.get("daddr") ?? url.searchParams.get("destination") ?? undefined;
    if (from || to) return { from: from ?? undefined, to: to ?? undefined };
  } catch {
    /* not a URL */
  }
  // "A to B" free text
  const toMatch = s.match(/^(.*?)\s+(?:to|→|->)\s+(.*)$/i);
  if (toMatch) return { from: toMatch[1].trim(), to: toMatch[2].trim() };
  return {};
}

// --- helpers ---
function shortName(display: string): string {
  return display.split(",").slice(0, 2).join(",").trim();
}
function fmtDuration(seconds: number): string {
  const min = Math.round(seconds / 60);
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function haversineMiles(a: Place, b: Place): number {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
