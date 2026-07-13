"use client";

import { useEffect, useRef, useState } from "react";
import type { POI } from "@/lib/types";
import { CATEGORY } from "@/lib/categories";
import { metersToMilesString } from "@/lib/geo";
import ProximityMark from "@/components/ProximityMark";
import Waveform from "@/components/Waveform";

/* rgba helper (shared contract) */
const hexA = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

type CardState = "appearing" | "playing" | "digging" | "deepDive" | "dismissing";

export default function POICard({
  poi,
  progress = 0,
  playing = false,
  isBookmarked = false,
  onTellMeMore,
  onDismiss,
  onBookmark,
}: {
  poi: POI;
  progress?: number;
  playing?: boolean;
  userLocation?: any;
  heading?: number;
  isBookmarked?: boolean;
  onTellMeMore: () => void;
  onDismiss: () => void;
  onBookmark?: () => void;
}) {
  const [state, setState] = useState<CardState>(playing ? "playing" : "appearing");
  const [bookmarked, setBookmarked] = useState(isBookmarked);
  const [audioPlaying, setAudioPlaying] = useState(true);

  const cat = CATEGORY[poi.category];
  const meta = `${metersToMilesString(poi.distance)} AHEAD · ON YOUR LEFT`.toUpperCase();
  const era = (poi.narration?.era ?? "1900s").toUpperCase();
  const excerpt =
    poi.narration?.narration ??
    `Long before the highway found it, ${poi.name} sat quietly at the edge of the map — a place travelers noted, named, and told stories about. What survives is a handful of accounts, half memory and half record, waiting for someone passing close enough to listen.`;

  const toldRef = useRef(false);
  const dismissedRef = useRef(false);

  /* ---- interactions ---- */
  function tellMore() {
    if (state === "digging" || state === "deepDive" || state === "dismissing") return;
    setState("digging");
    if (!toldRef.current) {
      toldRef.current = true;
      onTellMeMore();
    }
  }

  function dismiss() {
    if (state === "dismissing" || dismissedRef.current) return;
    dismissedRef.current = true;
    setState("dismissing");
    window.setTimeout(() => onDismiss(), 900);
  }

  function toggleBookmark() {
    setBookmarked((b) => !b);
    onBookmark?.();
  }

  /* digging auto-advances to the deep dive */
  useEffect(() => {
    if (state !== "digging") return;
    const id = window.setTimeout(() => setState("deepDive"), 1600);
    return () => window.clearTimeout(id);
  }, [state]);

  /* ---- swipe-down (pointer events) ---- */
  const startY = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);

  function onPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("button")) return;
    startY.current = e.clientY;
  }
  function onPointerMove(e: React.PointerEvent) {
    if (startY.current == null) return;
    setDragY(Math.max(0, e.clientY - startY.current));
  }
  function endDrag() {
    if (startY.current == null) return;
    const dy = dragY;
    startY.current = null;
    if (dy > 90) dismiss();
    else setDragY(0);
  }

  const dismissing = state === "dismissing";
  const tall = state === "digging" || state === "deepDive";
  const surfaced = state === "playing" || state === "deepDive";

  return (
    <div
      className={`card${dismissing ? " leaving" : ""}${tall ? " tall" : ""}`}
      role="dialog"
      aria-label={poi.name}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      style={
        dismissing
          ? undefined
          : {
              transform: `translateY(${dragY}px)`,
              opacity: dragY > 0 ? Math.max(0.4, 1 - dragY / 260) : 1,
              transition: startY.current == null ? "transform 0.3s cubic-bezier(0.2,0.9,0.3,1), opacity 0.3s" : "none",
            }
      }
    >
      <button className="grabber" onClick={dismiss} aria-label="Dismiss" />

      <button
        className="bookmark"
        onClick={toggleBookmark}
        aria-label={bookmarked ? "Remove bookmark" : "Bookmark story"}
        style={{ color: bookmarked ? "var(--gold)" : "var(--text-3)" }}
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill={bookmarked ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        >
          <path d="M6 3h12v18l-6-4-6 4z" />
        </svg>
      </button>

      {dismissing ? (
        <DismissedBody />
      ) : (
        <>
          {/* media */}
          <div className="media">
            {surfaced ? <SurfacedPhoto /> : <ShimmerPhoto />}
          </div>

          {/* category row */}
          <div className="cat-row">
            <span className="cat-chip" style={{ background: hexA(cat.base, 0.16) }}>
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke={cat.darkTint}
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={cat.icon} />
              </svg>
            </span>
            <span className="eyebrow cat-label" style={{ color: cat.darkTint }}>
              {cat.label}
              {state === "deepDive" && <span className="era"> · {era}</span>}
            </span>

            {state === "playing" && (
              <span className="playing-tag">
                <i className="ember-dot" />
                <span className="mono">PLAYING</span>
              </span>
            )}
          </div>

          {/* name + metadata */}
          <h2 className="poi-name">{poi.name}</h2>
          <div className="mono poi-meta">{meta}</div>

          {/* progress bar (playing) */}
          {state === "playing" && (
            <>
              <div className="bar">
                <span style={{ width: `${Math.round(clamp(progress) * 100)}%` }} />
              </div>
              <div className="times">
                <span className="mono">0:32</span>
                <span className="mono">1:24</span>
              </div>
            </>
          )}

          {/* deep-dive excerpt + waveform + scrubber */}
          {state === "deepDive" && (
            <>
              <p className="serif excerpt">{excerpt}</p>
              <Waveform playing={audioPlaying} />
              <div className="scrubber">
                <span className="mono time-now">1:02</span>
                <span className="mono time-total">2:40</span>
                <button
                  className="playpause"
                  onClick={() => setAudioPlaying((p) => !p)}
                  aria-label={audioPlaying ? "Pause" : "Play"}
                >
                  {audioPlaying ? (
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
            </>
          )}

          {/* digging interstitial */}
          {state === "digging" && (
            <div className="digging">
              <ProximityMark state="digging" size={40} />
              <div className="digging-copy">
                <div className="digging-title">Digging deeper…</div>
                <div className="digging-sub">Writing a longer story for this spot</div>
              </div>
            </div>
          )}

          {/* CTA (appearing + playing) */}
          {(state === "appearing" || state === "playing") && (
            <>
              <div className="hairline" />
              <button className="cta" onClick={tellMore}>
                {state === "playing" ? "Tell me more →" : "Tell me more"}
              </button>
            </>
          )}
        </>
      )}

      <style jsx>{`
        .card {
          position: relative;
          width: min(440px, 92vw);
          background: var(--surface);
          border: 1px solid var(--hairline);
          border-radius: var(--r-card);
          box-shadow: var(--shadow);
          padding: 20px;
          touch-action: pan-y;
          animation: rise 0.45s cubic-bezier(0.2, 0.9, 0.3, 1);
        }
        .card.tall {
          transition: min-height 0.3s ease;
          min-height: 480px;
        }
        .card.leaving {
          animation: leave 0.9s cubic-bezier(0.4, 0, 0.6, 1) forwards;
          pointer-events: none;
        }
        @keyframes rise {
          from {
            transform: translateY(40px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes leave {
          to {
            transform: translateY(90px);
            opacity: 0;
          }
        }

        .grabber {
          display: block;
          width: 40px;
          height: 5px;
          border: none;
          border-radius: 999px;
          background: var(--text-3);
          opacity: 0.5;
          margin: 0 auto 14px;
          cursor: grab;
        }
        .bookmark {
          position: absolute;
          top: 12px;
          right: 12px;
          background: none;
          border: none;
          min-width: 44px;
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .media {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          border-radius: 14px;
          overflow: hidden;
          margin-bottom: 16px;
          background: var(--surface-raised);
        }

        .cat-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
        }
        .cat-chip {
          width: 34px;
          height: 34px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: none;
        }
        .cat-label {
          letter-spacing: 0.18em;
          font-size: 12px;
        }
        .era {
          color: var(--text-3);
        }
        .playing-tag {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .playing-tag .mono {
          font-size: 11px;
          letter-spacing: 0.16em;
          color: var(--ember);
        }
        .ember-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: var(--ember);
          box-shadow: 0 0 0 0 ${hexA("#db6a40", 0.5)};
          animation: pulse 1.6s ease-out infinite;
        }
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 ${hexA("#db6a40", 0.5)};
          }
          70% {
            box-shadow: 0 0 0 7px ${hexA("#db6a40", 0)};
          }
          100% {
            box-shadow: 0 0 0 0 ${hexA("#db6a40", 0)};
          }
        }

        .poi-name {
          font-family: "Hanken Grotesk", sans-serif;
          font-weight: 700;
          font-size: 30px;
          line-height: 1.1;
          letter-spacing: -0.01em;
          margin: 0;
          color: var(--text-1);
          text-wrap: balance;
        }
        .poi-meta {
          font-size: 13px;
          color: var(--text-2);
          margin-top: 8px;
          letter-spacing: 0.06em;
        }

        .bar {
          height: 5px;
          border-radius: 999px;
          background: var(--hairline);
          margin-top: 18px;
          overflow: hidden;
        }
        .bar span {
          display: block;
          height: 100%;
          background: var(--ember);
          border-radius: 999px;
          transition: width 0.2s linear;
        }
        .times {
          display: flex;
          justify-content: space-between;
          margin-top: 7px;
        }
        .times .mono {
          font-size: 12px;
          color: var(--text-3);
          font-variant-numeric: tabular-nums;
        }

        .excerpt {
          font-size: 18px;
          line-height: 1.55;
          font-style: italic;
          color: var(--text-1);
          margin: 16px 0 18px;
        }

        .scrubber {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 16px;
        }
        .scrubber .mono {
          font-size: 12px;
          color: var(--text-3);
          font-variant-numeric: tabular-nums;
        }
        .time-total {
          margin-left: 4px;
        }
        .playpause {
          margin-left: auto;
          width: 46px;
          height: 46px;
          border-radius: 999px;
          border: none;
          background: var(--amber);
          color: var(--on-accent);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex: none;
        }

        .digging {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-top: 20px;
          padding: 6px 0;
        }
        .digging-copy {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .digging-title {
          font-family: "Hanken Grotesk", sans-serif;
          font-weight: 600;
          font-size: 16px;
          color: var(--text-1);
        }
        .digging-sub {
          font-size: 13px;
          color: var(--text-3);
        }

        .hairline {
          height: 1px;
          background: var(--hairline);
          margin: 18px 0 0;
        }
        .cta {
          margin-top: 16px;
          width: 100%;
          min-height: 44px;
          border: none;
          border-radius: var(--r-button);
          background: var(--amber);
          color: var(--on-accent);
          font-family: "Hanken Grotesk", sans-serif;
          font-weight: 700;
          font-size: 17px;
          padding: 16px;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .cta:active {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
}

/* ---------- media sub-views ---------- */

function ShimmerPhoto() {
  return (
    <div className="shimmer">
      <span className="mono label">LOADING PHOTO</span>
      <style jsx>{`
        .shimmer {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(
            100deg,
            var(--surface-raised) 30%,
            ${hexA("#cbb892", 0.18)} 50%,
            var(--surface-raised) 70%
          );
          background-size: 220% 100%;
          animation: shimmer 1.5s linear infinite;
        }
        .label {
          font-size: 11px;
          letter-spacing: 0.18em;
          color: var(--text-3);
          opacity: 0.7;
        }
        @keyframes shimmer {
          from {
            background-position: 180% 0;
          }
          to {
            background-position: -80% 0;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .shimmer {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

function SurfacedPhoto() {
  return (
    <div className="photo">
      {/* desert sunset: warm amber high → dusky blue low */}
      <svg className="ridge" viewBox="0 0 320 180" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M0 180 L0 132 L40 120 L78 134 L120 108 L164 128 L210 100 L256 122 L296 106 L320 120 L320 180 Z"
          fill="#1c1626"
          opacity="0.92"
        />
      </svg>
      <span className="chip">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="9" cy="10" r="1.6" />
          <path d="M3 17l5-4 4 3 3-2 6 5" />
        </svg>
        <span className="mono">SURFACED MEDIA</span>
      </span>
      <style jsx>{`
        .photo {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            #e8a24d 0%,
            #d98a4a 26%,
            #b06a56 48%,
            #6d5a72 72%,
            #3a3f5e 100%
          );
        }
        .ridge {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
        .chip {
          position: absolute;
          left: 10px;
          bottom: 10px;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 9px;
          border-radius: 999px;
          background: rgba(20, 16, 24, 0.55);
          backdrop-filter: blur(6px);
          color: rgba(255, 255, 255, 0.82);
        }
        .chip .mono {
          font-size: 10px;
          letter-spacing: 0.14em;
        }
      `}</style>
    </div>
  );
}

function DismissedBody() {
  return (
    <div className="saved">
      <div className="check">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <div className="mono saved-title">STORY SAVED TO YOUR TRIP</div>
      <div className="mono saved-cap">FADING · SWIPE ↓ TO DISMISS</div>
      <style jsx>{`
        .saved {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 26px 0 14px;
          text-align: center;
        }
        .check {
          width: 56px;
          height: 56px;
          border-radius: 999px;
          border: 2px solid var(--gold);
          color: var(--gold);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .saved-title {
          font-size: 12px;
          letter-spacing: 0.16em;
          color: var(--text-3);
        }
        .saved-cap {
          font-size: 10px;
          letter-spacing: 0.16em;
          color: var(--text-3);
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
}

function clamp(n: number) {
  return Math.max(0, Math.min(1, n));
}
