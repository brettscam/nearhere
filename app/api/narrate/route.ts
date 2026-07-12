import { NextRequest, NextResponse } from "next/server";
import type { Narration } from "@/lib/types";

export const runtime = "edge";

const MODEL = "claude-sonnet-4-6";

interface NarrateBody {
  lat: number;
  lon: number;
  region?: string;
  features?: string[];
  speedMph?: number;
  type?: "alert" | "deep_dive";
}

function systemPrompt(b: NarrateBody): string {
  const kind = b.type === "deep_dive" ? "deep_dive" : "alert";
  const features = (b.features ?? []).slice(0, 6).join("; ") || "none catalogued nearby";
  return `You are a knowledgeable, curious tour guide narrating for travelers driving through this area. Your tone is conversational, warm, and engaging — like a well-traveled friend, not a textbook.

Location: ${b.lat}, ${b.lon}
Nearest known features: ${features}
Region: ${b.region ?? "unknown"}
User speed: ${b.speedMph ?? 0} mph (they are driving, keep it concise)

Generate a ${kind} about this location:
- "alert": 2-3 sentences, 20-40 seconds spoken. What is this place, why does it matter, one vivid detail.
- "deep_dive": 4-8 sentences, 2-3 minutes spoken. Expanded history, context, notable people, geological or cultural significance. End with a natural conversational hook.

Respond with ONLY valid JSON, no markdown:
{"title":"short POI name","category":"geology|history|indigenous|ecology|architecture|folklore|industry|military|culture|astronomy","era":"prehistoric|preColonial|colonial|1800s|1900s|modern","narration":"the spoken text","followUpHook":"optional question to prompt user curiosity"}`;
}

export async function POST(req: NextRequest) {
  const key = process.env.ANTHROPIC_API_KEY;
  const body = (await req.json()) as NarrateBody;

  if (!key) {
    // Graceful offline/dev fallback so the UI still demonstrates end-to-end.
    return NextResponse.json(
      {
        narration: fallbackNarration(body),
        source: "fallback",
      },
      { status: 200 },
    );
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: systemPrompt(body),
        messages: [{ role: "user", content: "Generate the narration now." }],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `anthropic ${res.status}: ${text.slice(0, 200)}` }, { status: 502 });
    }

    const data = await res.json();
    const raw: string = data?.content?.[0]?.text ?? "";
    const jsonText = raw.replace(/```json\s*|\s*```/g, "").trim();
    const parsed = JSON.parse(jsonText) as Narration;
    return NextResponse.json({ narration: parsed, source: "claude" });
  } catch (e: any) {
    return NextResponse.json({ error: String(e).slice(0, 200) }, { status: 500 });
  }
}

/** A believable placeholder when no API key is configured. */
function fallbackNarration(b: NarrateBody): Narration {
  const place = b.region ?? "this stretch of road";
  const feature = b.features?.[0];
  return {
    title: feature ?? "Nearby",
    category: "history",
    era: "modern",
    narration: feature
      ? `Just off your route sits ${feature}. This part of ${place} has quietly shaped the people who've passed through — the kind of place easy to drive by and never notice. (Add an ANTHROPIC_API_KEY to hear the real, AI-written story.)`
      : `You're moving through ${place}. Add an ANTHROPIC_API_KEY in your Vercel project settings and Nearhere will start writing a real story for wherever you are.`,
    followUpHook: "Want to know who first mapped this land?",
  };
}
