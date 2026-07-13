"use client";

/*
 * Solo Driving Mode — the "honest safety default" for solo drivers.
 *
 * The philosophy: visuals off, near-black, the WHOLE screen is one tap target.
 * A driver alone in the car has no passenger to work the phone, so we refuse to
 * ask them to aim at small controls at speed. Everything happens in the ear;
 * the screen only exists to be tapped anywhere to play/pause. Motion is kept
 * minimal and disabled entirely under prefers-reduced-motion.
 */

import Link from "next/link";
import { useApp } from "@/lib/store";
import ProximityMark from "@/components/ProximityMark";

export default function SoloPage() {
  const { nowPlaying, isPlaying, togglePlay } = useApp();

  return (
    <main
      role="button"
      tabIndex={0}
      aria-label={isPlaying ? "Tap anywhere to pause" : "Tap anywhere to play"}
      onClick={() => togglePlay()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          togglePlay();
        }
      }}
      className="solo"
    >
      {/* tiny mono eyebrow, top-center */}
      <div className="eyebrow topLabel">
        {isPlaying ? "SOLO MODE · PLAYING" : "SOLO MODE"}
      </div>

      {/* center */}
      <div className="center">
        {isPlaying ? (
          <>
            <div className="mark">
              <ProximityMark state="narrating" size={160} />
            </div>
            {nowPlaying?.title && (
              <div className="nowTitle">{nowPlaying.title}</div>
            )}
          </>
        ) : (
          <>
            <span aria-hidden="true" className="dot" />
            <div className="pausedHint">Tap anywhere to play</div>
          </>
        )}
      </div>

      {/* unobtrusive exit affordance, corner — does not trigger the full-screen tap */}
      <Link
        href="/settings"
        onClick={(e) => e.stopPropagation()}
        className="mono exit"
        style={{ color: "var(--text-3)" }}
        aria-label="Exit solo driving mode"
      >
        ✕ exit
      </Link>

      <style jsx>{`
        .solo {
          position: fixed;
          inset: 0;
          width: 100%;
          min-height: 100dvh;
          background: #0a0b08;
          color: var(--text-3);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          cursor: pointer;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          outline: none;
        }
        .topLabel {
          position: absolute;
          top: max(24px, env(safe-area-inset-top));
          left: 0;
          right: 0;
          text-align: center;
          color: var(--text-3);
          opacity: 0.5;
          letter-spacing: 0.24em;
          font-size: 11px;
        }
        .center {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 20px;
          text-align: center;
        }
        .mark {
          opacity: 0.25;
        }
        .nowTitle {
          font-family: "Hanken Grotesk", sans-serif;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-3);
          opacity: 0.7;
          max-width: 280px;
        }
        .dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: var(--text-3);
          opacity: 0.35;
        }
        .pausedHint {
          font-family: "Hanken Grotesk", sans-serif;
          font-size: 15px;
          color: var(--text-3);
          opacity: 0.45;
        }
        .exit {
          position: absolute;
          top: max(20px, env(safe-area-inset-top));
          right: 20px;
          color: var(--text-3);
          opacity: 0.4;
          text-decoration: none;
          font-size: 12px;
          letter-spacing: 0.08em;
          padding: 12px;
          margin: -12px;
        }
        @media (prefers-reduced-motion: reduce) {
          .mark {
            opacity: 0.2;
          }
        }
      `}</style>
    </main>
  );
}
