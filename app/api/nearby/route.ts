import { NextRequest, NextResponse } from "next/server";
import { overpassNearby, reverse, METERS_PER_MILE } from "@/lib/osm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") ?? "");
  const lon = parseFloat(req.nextUrl.searchParams.get("lon") ?? "");
  const radiusMiles = parseFloat(req.nextUrl.searchParams.get("radius") ?? "6");
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return NextResponse.json({ features: [], context: { summary: "Somewhere out there" } }, { status: 200 });
  }
  // widen the search if the immediate area is empty (rural roads)
  const radii = [radiusMiles, radiusMiles * 2.5, radiusMiles * 6];
  let features: Awaited<ReturnType<typeof overpassNearby>> = [];
  for (const r of radii) {
    features = await overpassNearby(lat, lon, r * METERS_PER_MILE, 40);
    if (features.length) break;
  }
  const context = await reverse(lat, lon);
  return NextResponse.json({ features, context });
}
