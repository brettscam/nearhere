import { NextRequest, NextResponse } from "next/server";
import { geocode } from "@/lib/osm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const results = await geocode(q, 5);
  return NextResponse.json({ results });
}
