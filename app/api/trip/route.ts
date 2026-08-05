import { NextRequest, NextResponse } from "next/server";
import { geocode, osrmRoute, sampleRoute, overpassAlongRoute, wikipediaNearby, mergeFeatures, haversineMiles, METERS_PER_MILE } from "@/lib/osm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DURATIONS = ["2:10", "2:24", "2:38", "2:52", "3:05", "1:58"];

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const near = coordFrom(p.get("lat"), p.get("lon"));
  return build(p.get("from") ?? "", p.get("to") ?? "", near);
}

export async function POST(req: NextRequest) {
  let body: { from?: string; to?: string; lat?: number; lon?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const near = coordFrom(body.lat, body.lon);
  return build(body.from ?? "", body.to ?? "", near);
}

function coordFrom(lat: unknown, lon: unknown): { lat: number; lon: number } | undefined {
  const la = typeof lat === "string" ? parseFloat(lat) : (lat as number);
  const lo = typeof lon === "string" ? parseFloat(lon) : (lon as number);
  return Number.isFinite(la) && Number.isFinite(lo) ? { lat: la, lon: lo } : undefined;
}

async function build(rawFrom: string, rawTo: string, near?: { lat: number; lon: number }) {
  const fromQ = rawFrom.trim();
  const toQ = rawTo.trim();
  if (!fromQ || !toQ) return NextResponse.json({ error: "Enter both a start and destination." }, { status: 400 });

  // Origin: prefer results near the traveler (bounded if we have their GPS).
  let fromHits = near ? await geocode(fromQ, 1, near, { bounded: true, box: 6 }) : [];
  if (!fromHits.length) fromHits = await geocode(fromQ, 1, near, { box: 6 });
  const a = fromHits[0];
  if (!a) return NextResponse.json({ error: `Couldn't find "${fromQ}". Try adding the state.` }, { status: 422 });

  // Destination: restrict to a box around the origin first (kills Hamilton, ON
  // when you mean Hamilton, MT), then fall back to unbounded for far trips.
  const originNear = { lat: a.lat, lon: a.lon };
  let toHits = await geocode(toQ, 1, originNear, { bounded: true, box: 6 });
  if (!toHits.length) toHits = await geocode(toQ, 1, originNear, { box: 6 });
  const b = toHits[0];
  if (!b) return NextResponse.json({ error: `Couldn't find "${toQ}". Try adding the state.` }, { status: 422 });

  const route = await osrmRoute(a, b);
  if (!route) return NextResponse.json({ error: "Couldn't route between those places." }, { status: 422 });

  const { distanceMiles, durationText, coordinates } = route;
  const interval = Math.min(30, Math.max(10, distanceMiles / 6));
  const samples = sampleRoute(coordinates, interval, 6);
  // Two sources in parallel: OSM (Overpass) for natural/POI features, and
  // Wikipedia geosearch for notable/historic places OSM misses.
  const [overpassFeatures, ...wikiLists] = await Promise.all([
    overpassAlongRoute(samples, interval * 0.6 * METERS_PER_MILE, 80),
    ...samples.map((p) => wikipediaNearby(p.lat, p.lon, 10000, 15)),
  ]);
  const features = mergeFeatures(overpassFeatures, wikiLists.flat());

  // position each feature along the route (0..1)
  const nearestT = (lat: number, lon: number): number => {
    let best = Infinity;
    let bestI = 0;
    for (let i = 0; i < coordinates.length; i++) {
      const d = haversineMiles({ lat, lon }, { lat: coordinates[i][1], lon: coordinates[i][0] });
      if (d < best) {
        best = d;
        bestI = i;
      }
    }
    return coordinates.length > 1 ? bestI / (coordinates.length - 1) : 0;
  };

  const targetCount = Math.min(40, Math.max(8, Math.round(distanceMiles / 8)));

  // Position each feature along the route, then spread the picks across the
  // whole route (bucket by position, take the best in each) so stories aren't
  // all clustered in the first town.
  const positioned = features.map((f) => ({ f, t: nearestT(f.lat, f.lon) }));
  const segments = Math.min(targetCount, 14);
  const buckets: { f: (typeof positioned)[number]["f"]; t: number }[][] = Array.from({ length: segments }, () => []);
  for (const item of positioned) {
    const idx = Math.min(segments - 1, Math.max(0, Math.floor(item.t * segments)));
    buckets[idx].push(item);
  }
  const perBucket = Math.max(1, Math.ceil(targetCount / segments));
  const picks: { f: (typeof positioned)[number]["f"]; t: number }[] = [];
  for (const b of buckets) {
    b.sort((x, y) => y.f.significance - x.f.significance);
    picks.push(...b.slice(0, perBucket));
  }
  picks.sort((x, y) => x.t - y.t);

  const stories = picks.slice(0, targetCount).map((item, i) => ({
    id: item.f.id,
    title: item.f.name,
    category: item.f.category,
    duration: DURATIONS[i % DURATIONS.length],
    routeT: item.t,
    lat: item.f.lat,
    lon: item.f.lon,
    milesAhead: Math.round(item.t * distanceMiles * 10) / 10,
    status: i === 0 ? ("playing" as const) : ("queued" as const),
  }));

  const trip = {
    id: `custom-${Date.now()}`,
    origin: a.name.split(",")[0],
    destination: b.name.split(",")[0],
    dateLabel: "NOW",
    distanceMiles: Math.round(distanceMiles),
    driveTime: durationText,
    storyCount: stories.length,
    status: "active" as const,
    offline: false,
    stories,
  };

  return NextResponse.json({ trip, origin: a, destination: b });
}
