"use client";

import Link from "next/link";
import { useApp } from "@/lib/store";
import { CatIcon, StatTile, Eyebrow, PageTitle, iconBtn } from "@/components/ui/kit";
import BottomNav from "@/components/ui/BottomNav";
import RouteMap from "@/components/RouteMap";
import { findTrip } from "@/lib/seed";
import { CATEGORY } from "@/lib/categories";

export default function TripSummaryPage() {
  const { playStory, toggleBookmark, isBookmarked } = useApp();
  const trip = findTrip("bishop-tahoe-past")!;

  // Map heard → queued so the map renders gold pins per design.
  const goldStories = trip.stories.map((s) => ({ ...s, status: "queued" as const }));

  const rows = trip.stories.slice(0, 6);

  const share = async () => {
    const title = `${trip.origin} → ${trip.destination}`;
    const text = `I just finished the ${trip.origin} → ${trip.destination} drive on Nearhere — ${trip.heardCount} stories heard across ${trip.distanceMiles} miles. ${rows
      .map((s) => s.title)
      .join(", ")}.`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, text });
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(`${title}\n${text}`);
      }
    } catch {
      /* user cancelled or unsupported */
    }
  };

  const bookmarked = isBookmarked(trip.id);

  return (
    <main className="wrap">
      {/* Back */}
      <div style={{ marginBottom: 20 }}>
        <Link href="/trips" aria-label="Back to trips" style={iconBtn}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
      </div>

      <Eyebrow color="var(--gold)">TRIP COMPLETE</Eyebrow>
      <PageTitle>
        {trip.origin} &rarr; {trip.destination}
      </PageTitle>

      <div style={{ marginTop: 20 }}>
        <RouteMap stories={goldStories} height={240} />
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <StatTile value={String(trip.heardCount ?? 0)} caption="STORIES HEARD" />
        <StatTile value="212" caption="MILES" />
        <StatTile value="4:20" caption="HOURS" />
      </div>

      {/* Story list with replay */}
      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((story) => (
          <div
            key={story.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "var(--surface)",
              border: "1px solid var(--hairline)",
              borderRadius: "var(--r-card)",
              padding: 14,
            }}
          >
            <CatIcon category={story.category} size={40} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontFamily: "'Hanken Grotesk',sans-serif",
                  fontWeight: 700,
                  fontSize: 16,
                  color: "var(--text-1)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {story.title}
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  letterSpacing: "0.06em",
                  color: "var(--text-3)",
                  marginTop: 3,
                }}
              >
                {CATEGORY[story.category].label.toUpperCase()} &middot; {story.duration}
              </div>
            </div>
            <button
              onClick={() => playStory(story)}
              aria-label={`Replay ${story.title}`}
              style={{
                width: 44,
                height: 44,
                flex: "none",
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                background: "var(--amber)",
                color: "var(--on-accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Share + bookmark */}
      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <button className="share" onClick={share}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
          </svg>
          Share trip
        </button>
        <button
          onClick={() => toggleBookmark(trip.id)}
          aria-label={bookmarked ? "Remove bookmark" : "Bookmark trip"}
          aria-pressed={bookmarked}
          style={{
            width: 56,
            height: 56,
            flex: "none",
            borderRadius: "var(--r-button)",
            border: "1px solid var(--hairline)",
            background: "var(--surface)",
            color: "var(--gold)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill={bookmarked ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 3h12v18l-6-4-6 4z" />
          </svg>
        </button>
      </div>

      <BottomNav />

      <style jsx>{`
        .wrap {
          position: relative;
          width: 100%;
          max-width: 480px;
          margin: 0 auto;
          min-height: 100dvh;
          padding: max(24px, env(safe-area-inset-top)) 24px 96px;
        }
        .share {
          flex: 1;
          height: 56px;
          border: none;
          border-radius: var(--r-button);
          background: var(--amber);
          color: var(--on-accent);
          font-family: "Hanken Grotesk", sans-serif;
          font-weight: 700;
          font-size: 17px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: opacity 0.2s;
        }
        .share:active {
          opacity: 0.9;
        }
      `}</style>
    </main>
  );
}
