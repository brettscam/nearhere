"use client";

import { useState } from "react";
import type { POI } from "@/lib/types";
import { CATEGORY } from "@/lib/categories";
import { metersToMilesString } from "@/lib/geo";

export default function POICard({
  poi,
  progress = 0,
  playing = false,
  onTellMeMore,
  onDismiss,
}: {
  poi: POI;
  progress?: number;
  playing?: boolean;
  onTellMeMore: () => void;
  onDismiss: () => void;
}) {
  const [bookmarked, setBookmarked] = useState(false);
  const cat = CATEGORY[poi.category];
  const meta = `${metersToMilesString(poi.distance)} AHEAD`.toUpperCase();

  return (
    <div className="card" role="dialog" aria-label={poi.name}>
      <button className="grabber" onClick={onDismiss} aria-label="Dismiss" />

      <button
        className="bookmark"
        onClick={() => setBookmarked((b) => !b)}
        aria-label={bookmarked ? "Remove bookmark" : "Bookmark story"}
        style={{ color: bookmarked ? "var(--gold)" : "var(--text-3)" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
          <path d="M6 3h12v18l-6-4-6 4z" />
        </svg>
      </button>

      <div className="cat-row">
        <span className="cat-chip" style={{ background: hexA(cat.base, 0.16) }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={cat.darkTint} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d={cat.icon} />
          </svg>
        </span>
        <span className="eyebrow" style={{ color: cat.darkTint, letterSpacing: "0.18em" }}>
          {cat.label}
        </span>
        <span className="mono era">{eraLabel(poi.narration?.era)}</span>
      </div>

      <h2 className="poi-name">{poi.name}</h2>
      <div className="mono poi-meta">{meta}</div>

      <div className="bar">
        <span style={{ width: `${Math.round(clamp(progress) * 100)}%` }} />
      </div>

      {playing && poi.narration?.narration && (
        <p className="serif narration">{poi.narration.narration}</p>
      )}
      {playing && poi.narration?.followUpHook && (
        <p className="serif hook">{poi.narration.followUpHook}</p>
      )}

      <button className="cta" onClick={onTellMeMore} disabled={playing}>
        {playing ? "Playing…" : "Tell me more"}
      </button>

      <style jsx>{`
        .card {
          position: relative;
          width: min(440px, 92vw);
          background: var(--surface);
          border: 1px solid var(--hairline);
          border-radius: var(--r-card);
          box-shadow: var(--shadow);
          padding: var(--sp-card);
          animation: rise 0.45s cubic-bezier(0.2, 0.9, 0.3, 1);
        }
        @keyframes rise {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
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
        }
        .bookmark {
          position: absolute;
          top: 14px;
          right: 14px;
          background: none;
          border: none;
          padding: 8px;
          display: flex;
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
        .era {
          margin-left: auto;
          font-size: 12px;
          color: var(--text-3);
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
          font-size: 14px;
          color: var(--text-2);
          margin-top: 8px;
          letter-spacing: 0.04em;
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
        .narration {
          font-size: 18px;
          line-height: 1.55;
          color: var(--text-1);
          margin: 18px 0 0;
        }
        .hook {
          font-size: 17px;
          font-style: italic;
          color: var(--text-2);
          margin: 10px 0 0;
        }
        .cta {
          margin-top: 18px;
          width: 100%;
          border: none;
          border-radius: var(--r-button);
          background: var(--amber);
          color: var(--on-accent);
          font-family: "Hanken Grotesk", sans-serif;
          font-weight: 700;
          font-size: 17px;
          padding: 17px;
          transition: opacity 0.2s;
        }
        .cta:disabled {
          opacity: 0.85;
          cursor: default;
        }
      `}</style>
    </div>
  );
}

function clamp(n: number) {
  return Math.max(0, Math.min(1, n));
}
function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
function eraLabel(era?: string) {
  if (!era) return "";
  const map: Record<string, string> = {
    prehistoric: "Prehistoric",
    preColonial: "Pre-Colonial",
    colonial: "Colonial",
    "1800s": "1800s",
    "1900s": "1900s",
    modern: "Modern",
  };
  return map[era] ?? era;
}
