"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { CatIcon, Eyebrow } from "@/components/ui/kit";
import BottomNav from "@/components/ui/BottomNav";
import { CATEGORY } from "@/lib/categories";
import type { Story } from "@/lib/types";

export default function ActiveTripPage() {
  const { queue, nowPlaying, progress, isPlaying, playStory, togglePlay } = useApp();
  const started = useRef(false);

  // On mount, begin playback if nothing is playing yet (guarded to run once).
  useEffect(() => {
    if (started.current) return;
    if (!nowPlaying && queue.length) {
      started.current = true;
      playStory(queue.find((s) => s.status === "playing") ?? queue[0]);
    }
  }, [nowPlaying, queue, playStory]);

  const current = nowPlaying ?? queue[0] ?? null;
  const upNext = queue.filter((s) => (current ? s.id !== current.id : true));
  const queuedCount = queue.filter((s) => s.status === "queued").length;

  return (
    <main className="wrap">
      {/* ---- Header ---- */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span className="pulse-dot" />
        <span className="eyebrow" style={{ color: "#4fbf7a", letterSpacing: "0.2em" }}>
          TRIP MODE ACTIVE
        </span>
      </div>

      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
        <h1 className="serif" style={{ fontWeight: 500, fontSize: 28, lineHeight: 1.1, letterSpacing: "-0.02em", margin: 0, color: "var(--text-1)" }}>
          Along your route
        </h1>
        <div style={{ textAlign: "right", flex: "none" }}>
          <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 700, fontSize: 40, lineHeight: 1, color: "var(--amber)" }}>
            {queuedCount}
          </div>
          <div className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--text-3)", marginTop: 2 }}>
            nearby now
          </div>
        </div>
      </header>

      {/* ---- NOW PLAYING ---- */}
      {current && (
        <div
          style={{
            position: "relative",
            background: "var(--surface)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--r-card)",
            padding: 14,
            overflow: "hidden",
            marginBottom: 28,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <CatIcon category={current.category} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 700, fontSize: 17,
                  color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}
              >
                {current.title}
              </div>
              <div className="mono" style={{ fontSize: 11, letterSpacing: "0.08em", color: "var(--ember)", marginTop: 3 }}>
                NOW PLAYING · 0:32 / {current.duration}
              </div>
            </div>
            <button
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
              style={{
                width: 46, height: 46, borderRadius: 999, flex: "none", cursor: "pointer",
                border: "none", background: "var(--amber)", color: "var(--on-accent)",
                display: "flex", alignItems: "center", justifyContent: "center",
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

          {/* thin ember progress bar spanning the card */}
          <div
            style={{
              position: "absolute", left: 0, right: 0, bottom: 0, height: 3,
              background: "color-mix(in srgb, var(--ember) 22%, transparent)",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.round(Math.min(Math.max(progress, 0), 1) * 100)}%`,
                background: "var(--ember)", transition: "width 0.2s linear",
              }}
            />
          </div>
        </div>
      )}

      {/* ---- UP NEXT ---- */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
        <Eyebrow>UP NEXT</Eyebrow>
        <span className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--text-3)" }}>
          by distance
        </span>
      </div>

      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {upNext.map((s) => (
          <QueueRow key={s.id} story={s} onPlay={() => playStory(s)} />
        ))}
      </ul>

      {/* ---- Legend ---- */}
      <div
        className="mono"
        style={{
          display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16,
          fontSize: 10, letterSpacing: "0.08em", color: "var(--text-3)",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Dot color="var(--ember)" /> Playing
        </span>
        <span style={{ color: "var(--text-3)" }}>·</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Dot color="var(--gold)" /> Queued
        </span>
        <span style={{ color: "var(--text-3)" }}>·</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, opacity: 0.5 }}>
          <span style={{ color: "var(--text-2)" }}>✓</span> Heard
        </span>
      </div>

      {/* ---- Map link ---- */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
        <Link
          href="/route"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "12px 20px", minHeight: 44, borderRadius: 999,
            border: "1px solid var(--hairline)", background: "var(--surface)",
            color: "var(--text-2)", textDecoration: "none",
            fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: 15,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z M9 4v14 M15 6v14" />
          </svg>
          View route map
        </Link>
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
        .pulse-dot {
          width: 8px;
          height: 8px;
          flex: none;
          border-radius: 999px;
          background: #4fbf7a;
          box-shadow: 0 0 0 0 rgba(79, 191, 122, 0.55);
          animation: pulse 1.8s ease-out infinite;
        }
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(79, 191, 122, 0.5);
          }
          70% {
            box-shadow: 0 0 0 7px rgba(79, 191, 122, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(79, 191, 122, 0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse-dot {
            animation: none;
          }
        }
      `}</style>
    </main>
  );
}

/* ---------- Queue row ---------- */
function QueueRow({ story, onPlay }: { story: Story; onPlay: () => void }) {
  const heard = story.status === "heard";
  const cat = CATEGORY[story.category];

  const inner = (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 0", borderBottom: "1px solid var(--hairline)",
        opacity: heard ? 0.5 : 1,
        width: "100%", textAlign: "left",
      }}
    >
      <CatIcon category={story.category} size={34} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: 15,
            color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}
        >
          {story.title}
        </div>
        <div className="mono" style={{ fontSize: 10.5, letterSpacing: "0.08em", color: cat.darkTint, marginTop: 3 }}>
          {heard ? "HEARD" : `${cat.label.toUpperCase()} · ${story.milesAhead} MI`}
        </div>
      </div>
      {heard ? (
        <span style={{ flex: "none", color: "var(--text-2)", fontSize: 15 }}>✓</span>
      ) : (
        <Dot color="var(--gold)" />
      )}
    </div>
  );

  if (heard) return <li>{inner}</li>;

  return (
    <li>
      <button
        onClick={onPlay}
        aria-label={`Play ${story.title}`}
        style={{
          display: "block", width: "100%", padding: 0, border: "none",
          background: "transparent", cursor: "pointer", minHeight: 44,
        }}
      >
        {inner}
      </button>
    </li>
  );
}

/* ---------- Small status dot ---------- */
function Dot({ color }: { color: string }) {
  return <span style={{ width: 8, height: 8, borderRadius: 999, background: color, flex: "none" }} />;
}
