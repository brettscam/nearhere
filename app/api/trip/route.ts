import { NextRequest, NextResponse } from "next/server";
import { geocode, osrmRoute, sampleRoute, overpassAlongRoute, haversineMiles, METERS_PER_MILE } from "@/lib/osm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const DURATIONS = ["2:10", "2:24", "2:38", "2:52", "3:05", "1:58"];

export async function GET(req: NextRequest) {
  return build(req.nextUrl.searchParams.get("from") ?? "", req.nextUrl.searchParams.get("to") ?? "");
}

export async function POST(req: NextRequest) {
  let body: { from?: string; to?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  return build(body.from ?? "", body.to ?? "");
}

async function build(rawFrom: string, rawTo: string) {
  const fromQ = rawFrom.trim();
  const toQ = rawTo.trim();
  if (!fromQ || !toQ) return NextResponse.json({ error: "Enter both a start and destination." }, { status: 400 });

  const [fromHits, toHits] = await Promise.all([geocode(fromQ, 1), geocode(toQ, 1)]);
  const a = fromHits[0];
  const b = toHits[0];
  if (!a) return NextResponse.json({ error: `Couldn't find "${fromQ}". Try adding the state.` }, { status: 422 });
  if (!b) return NextResponse.json({ error: `Couldn't find "${toQ}". Try adding the state.` }, { status: 422 });

  const route = await osrmRoute(a, b);
  if (!route) return NextResponse.json({ error: "Couldn't route between those places." }, { status: 422 });

  const { distanceMiles, durationText, coordinates } = route;
  const interval = Math.min(25, Math.max(8, distanceMiles / 10));
  const samples = sampleRoute(coordinates, interval, 12);
  const features = await overpassAlongRoute(samples, interval * 0.7 * METERS_PER_MILE, 80);

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
