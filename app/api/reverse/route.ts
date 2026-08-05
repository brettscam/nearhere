import { NextRequest, NextResponse } from "next/server";
import { reverse } from "@/lib/osm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") ?? "");
  const lon = parseFloat(req.nextUrl.searchParams.get("lon") ?? "");
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return NextResponse.json({ summary: "Somewhere out there" }, { status: 200 });
  }
  const ctx = await reverse(lat, lon);
  return NextResponse.json(ctx);
}
