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

  const targetCount = Math.min(40, Math.max(6, Math.round(distanceMiles / 8)));
  const top = features.slice(0, targetCount);

  const stories = top
    .map((f, i) => ({
      id: f.id,
      title: f.name,
      category: f.category,
      duration: DURATIONS[i % DURATIONS.length],
      routeT: nearestT(f.lat, f.lon),
      lat: f.lat,
      lon: f.lon,
    }))
    .sort((x, y) => x.routeT - y.routeT)
    .map((s, i) => ({
      ...s,
      milesAhead: Math.round(s.routeT * distanceMiles * 10) / 10,
      status: i === 0 ? "playing" : "queued",
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
