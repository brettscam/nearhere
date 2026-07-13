"use client";

import { useApp } from "@/lib/store";
import { CatIcon, iconBtn } from "@/components/ui/kit";
import BottomNav from "@/components/ui/BottomNav";
import RouteMap from "@/components/RouteMap";
import { CATEGORY } from "@/lib/categories";

export default function RoutePage() {
  const { queue, nowPlaying, isPlaying, togglePlay, playStory } = useApp();

  const ahead = queue.filter((s) => s.status !== "heard").length;
  const current = nowPlaying ?? queue[0];

  return (
    <main className="wrap">
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div>
          <div
            className="eyebrow"
            style={{ color: "var(--text-3)", letterSpacing: "0.2em", marginBottom: 8 }}
          >
            BISHOP &rarr; TAHOE
          </div>
          <h1
            style={{
              fontFamily: "'Hanken Grotesk',sans-serif",
              fontWeight: 700,
              fontSize: 30,
              letterSpacing: "-0.02em",
              margin: 0,
              color: "var(--text-1)",
            }}
          >
            {ahead} stories ahead
          </h1>
        </div>
        <button aria-label="Recenter on my location" style={iconBtn}>
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
            <circle cx="12" cy="12" r="7" />
            <circle cx="12" cy="12" r="2.5" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          </svg>
        </button>
      </div>

      {/* Map fills most of the screen */}
      <RouteMap
        stories={queue}
        height={420}
        onPin={(s) => playStory(s)}
        activeId={nowPlaying?.id}
      />

      {/* Now-playing mini card */}
      {current && (
        <div
          style={{
            marginTop: 14,
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "var(--surface)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--r-card)",
            padding: 14,
          }}
        >
          <CatIcon category={current.category} size={40} />
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
              {current.title}
            </div>
            <div
              className="mono"
              style={{
                fontSize: 11,
                letterSpacing: "0.06em",
                color: "var(--ember)",
                marginTop: 3,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {CATEGORY[current.category].label.toUpperCase()} &middot; PLAYING NOW &middot;{" "}
              {current.milesAhead} MI
            </div>
          </div>
          <button
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            style={{
              width: 48,
              height: 48,
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
            {isPlaying ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </div>
      )}

      {/* Helper line */}
      <div
        className="mono"
        style={{
          marginTop: 14,
          textAlign: "center",
          fontSize: 11,
          letterSpacing: "0.06em",
          color: "var(--text-3)",
        }}
      >
        Tap any pin for its story
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
      `}</style>
    </main>
  );
}
