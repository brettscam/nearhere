import { NextRequest, NextResponse } from "next/server";
import { overpassNearby, wikipediaNearby, mergeFeatures, reverse, METERS_PER_MILE } from "@/lib/osm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") ?? "");
  const lon = parseFloat(req.nextUrl.searchParams.get("lon") ?? "");
  const radiusMiles = parseFloat(req.nextUrl.searchParams.get("radius") ?? "6");
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return NextResponse.json({ features: [], context: { summary: "Somewhere out there" } }, { status: 200 });
  }
  // OSM + Wikipedia in parallel; widen once if the immediate area is empty.
  const radii = [radiusMiles, radiusMiles * 4];
  let osm: Awaited<ReturnType<typeof overpassNearby>> = [];
  for (const r of radii) {
    osm = await overpassNearby(lat, lon, r * METERS_PER_MILE, 40);
    if (osm.length) break;
  }
  const [wiki, context] = await Promise.all([
    wikipediaNearby(lat, lon, Math.min(radiusMiles * METERS_PER_MILE, 10000), 20),
    reverse(lat, lon),
  ]);
  const features = mergeFeatures(osm, wiki);
  return NextResponse.json({ features, context });
}
