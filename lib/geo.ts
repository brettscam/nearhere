import type { GeoFeature, GeoContext } from "./types";
import { categoryForFeature } from "./categories";

const METERS_PER_MILE = 1609.344;

export function milesToMeters(mi: number): number {
  return mi * METERS_PER_MILE;
}

export function metersToMilesString(m: number): string {
  const mi = m / METERS_PER_MILE;
  if (mi < 0.1) return "< 0.1 mi";
  if (mi < 10) return `${mi.toFixed(1)} mi`;
  return `${Math.round(mi)} mi`;
}

/** Haversine distance in meters. */
export function distanceMeters(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Adaptive radius (meters) by speed in mph — mirrors the iOS ProximityEngine. */
export function detectionRadiusMeters(speedMph: number): number {
  if (speedMph > 55) return milesToMeters(5);
  if (speedMph >= 25) return milesToMeters(2);
  return milesToMeters(0.5);
}

/** Significance heuristic for ranking features. */
export function significance(f: GeoFeature): number {
  let s = 0;
  if (f.name) s += 2;
  s += { historic: 1.5, tourism: 1, natural: 0.75, place: 0.5, other: 0 }[f.featureType];
  if (f.tags.wikipedia || f.tags.wikidata) s += 1;
  if (f.tags.heritage) s += 0.75;
  return s;
}

/** Reverse geocode via OSM Nominatim (browser-friendly, no key). */
export async function reverseGeocode(lat: number, lon: number): Promise<GeoContext> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=12&addressdetails=1`;
  try {
    const res = await fetch(url, {
      headers: { "Accept-Language": "en" },
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    const a = data.address ?? {};
    const region = a.state ?? a.region;
    const county = a.county;
    const locality = a.city ?? a.town ?? a.village ?? a.hamlet ?? a.suburb;
    const summary = [locality, county, region].filter(Boolean).join(", ") || data.name || "Somewhere out there";
    return { region, county, locality, country: a.country, summary };
  } catch {
    return { summary: "Somewhere out there" };
  }
}

/** Query Overpass for nearby historic / natural / tourism features. */
export async function nearbyFeatures(
  lat: number,
  lon: number,
  radiusMeters: number,
): Promise<GeoFeature[]> {
  const r = Math.round(radiusMeters);
  const q =
    `[out:json][timeout:20];(` +
    `node["historic"](around:${r},${lat},${lon});` +
    `node["natural"](around:${r},${lat},${lon});` +
    `node["tourism"](around:${r},${lat},${lon});` +
    `node["place"~"town|village|hamlet"](around:${r},${lat},${lon});` +
    `);out body 60;`;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(q),
  });
  if (!res.ok) throw new Error("Overpass " + res.status);
  const data = await res.json();

  const features: GeoFeature[] = (data.elements ?? [])
    .filter((e: any) => e.lat && e.lon)
    .map((e: any): GeoFeature => {
      const tags = e.tags ?? {};
      let featureType: GeoFeature["featureType"] = "other";
      if (tags.historic) featureType = "historic";
      else if (tags.tourism) featureType = "tourism";
      else if (tags.natural) featureType = "natural";
      else if (tags.place) featureType = "place";
      return {
        id: `node/${e.id}`,
        name: tags.name,
        featureType,
        lat: e.lat,
        lon: e.lon,
        tags,
        distance: distanceMeters({ lat, lon }, { lat: e.lat, lon: e.lon }),
      };
    });

  // Rank: significance first, then proximity.
  return features.sort((a, b) => {
    const s = significance(b) - significance(a);
    if (Math.abs(s) > 0.01) return s;
    return (a.distance ?? 0) - (b.distance ?? 0);
  });
}

export { categoryForFeature };
