"use client";

import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { ThemeToggle, iconBtn } from "@/components/ui/kit";
import BottomNav from "@/components/ui/BottomNav";
import ProximityMark, { MarkState } from "@/components/ProximityMark";
import POICard from "@/components/POICard";

export default function Home() {
  const router = useRouter();
  const {
    homeStatus,
    geoContext,
    nearbyPoi,
    demoMode,
    startListening,
    nowPlaying,
    progress,
    isPlaying,
    playStory,
    toggleBookmark,
    isBookmarked,
  } = useApp();

  const markState: MarkState =
    nowPlaying && isPlaying
      ? "narrating"
      : homeStatus === "locating"
        ? "digging"
        : homeStatus === "welcome"
          ? "idle"
          : "listening";

  const statusText =
    homeStatus === "welcome"
      ? "Tap start and Nearhere will listen for stories around you."
      : homeStatus === "locating"
        ? "Finding your place in the world…"
        : homeStatus === "error"
          ? "Couldn't reach the map database. Try again."
          : "Quietly scanning the road ahead. We'll speak up when something's worth it.";

  const isWelcome = homeStatus === "welcome";
  const showCard = !!nearbyPoi && homeStatus === "listening";
  const nearbyBookmarked = nearbyPoi ? isBookmarked(nearbyPoi.id) : false;

  return (
    <main className="wrap">
      <Contours />

      <header className="top">
        <div>
          <div className="eyebrow" style={{ color: "var(--text-3)", letterSpacing: "0.22em" }}>
            You're driving through
          </div>
          <div className="serif region">{geoContext?.summary ?? "Nearhere"}</div>
        </div>
        <ThemeToggle />
      </header>

      <section className="center">
        <ProximityMark state={markState} size={220} />

        {homeStatus === "listening" ? (
          <span className="pill">
            <span className="dot" />
            <span className="mono">Listening</span>
          </span>
        ) : isWelcome ? (
          <span className="pill pill-quiet">
            <span className="mono">Tap to begin</span>
          </span>
        ) : null}

        <p className="status" aria-live="polite">
          {statusText}
        </p>

        {demoMode && <p className="mono demo">demo location · Mono Lake, CA</p>}
      </section>

      <footer className="bottom">
        <button
          className="primary"
          onClick={isWelcome ? startListening : () => router.push("/trips")}
          disabled={homeStatus === "locating"}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 11l19-9-9 19-2-8-8-2z" />
          </svg>
          {isWelcome ? "Start listening" : "Start a trip"}
        </button>

        <button
          className="bookmark"
          onClick={() => nearbyPoi && toggleBookmark(nearbyPoi.id)}
          aria-label={nearbyBookmarked ? "Remove bookmark" : "Bookmark"}
          style={{
            ...iconBtn,
            width: 56,
            height: 56,
            borderRadius: "var(--r-button)",
            color: nearbyBookmarked ? "var(--gold)" : "var(--text-2)",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill={nearbyBookmarked ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 3h12v18l-6-4-6 4z" />
          </svg>
        </button>
      </footer>

      {showCard && nearbyPoi && (
        <div className="overlay">
          <POICard
            poi={nearbyPoi}
            playing={isPlaying}
            progress={progress}
            isBookmarked={isBookmarked(nearbyPoi.id)}
            onTellMeMore={() =>
              playStory({
                id: nearbyPoi.id,
                title: nearbyPoi.name,
                category: nearbyPoi.category,
                duration: "2:00",
                milesAhead: 0,
                status: "playing",
                routeT: 0,
                lat: nearbyPoi.lat,
                lon: nearbyPoi.lon,
              })
            }
            onDismiss={() => {}}
            onBookmark={() => toggleBookmark(nearbyPoi.id)}
          />
        </div>
      )}

      <BottomNav />

      <style jsx>{`
        .wrap {
          position: relative;
          width: 100%;
          max-width: 480px;
          margin: 0 auto;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          padding: max(24px, env(safe-area-inset-top)) 24px 96px;
          overflow: hidden;
        }
        .top {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }
        .region {
          font-weight: 500;
          font-size: 22px;
          letter-spacing: -0.01em;
          color: var(--text-1);
          margin-top: 4px;
          max-width: 70vw;
          text-wrap: balance;
        }
        .center {
          position: relative;
          z-index: 2;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 18px;
          text-align: center;
        }
        .pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 14px;
          border-radius: 999px;
          background: var(--surface);
          border: 1px solid var(--hairline);
        }
        .pill .mono {
          font-size: 12px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--text-2);
        }
        .pill-quiet .mono {
          color: var(--text-3);
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #3fb27f;
          box-shadow: 0 0 0 0 rgba(63, 178, 127, 0.5);
          animation: breathe 2.4s ease-in-out infinite;
        }
        @keyframes breathe {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(63, 178, 127, 0.45);
          }
          50% {
            box-shadow: 0 0 0 5px rgba(63, 178, 127, 0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .dot {
            animation: none;
          }
        }
        .status {
          font-family: "Hanken Grotesk", sans-serif;
          font-size: 18px;
          line-height: 1.5;
          color: var(--text-1);
          max-width: 30ch;
          margin: 0;
        }
        .demo {
          font-size: 12px;
          letter-spacing: 0.04em;
          color: var(--text-3);
          margin: 0;
        }
        .bottom {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: stretch;
          gap: 12px;
        }
        .primary {
          flex: 1;
          height: 56px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border: none;
          border-radius: var(--r-button);
          background: var(--amber);
          color: var(--on-accent);
          font-family: "Hanken Grotesk", sans-serif;
          font-weight: 700;
          font-size: 17px;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .primary:disabled {
          opacity: 0.7;
          cursor: default;
        }
        .bookmark {
          padding: 0;
        }
        .overlay {
          position: fixed;
          left: 0;
          right: 0;
          bottom: calc(78px + env(safe-area-inset-bottom));
          z-index: 45;
          display: flex;
          justify-content: center;
          padding: 0 16px;
          pointer-events: none;
          animation: springup 0.5s cubic-bezier(0.18, 0.89, 0.32, 1.15);
        }
        .overlay :global(.card) {
          pointer-events: auto;
        }
        @keyframes springup {
          from {
            transform: translateY(60px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .overlay {
            animation: none;
          }
        }
      `}</style>
    </main>
  );
}

/* ---------- Faint topographic contour background ---------- */
function Contours() {
  return (
    <svg
      className="contours"
      viewBox="0 0 400 800"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <g fill="none" stroke="var(--text-3)" strokeWidth="1" opacity="0.12">
        {Array.from({ length: 10 }).map((_, i) => {
          const y = 70 + i * 76;
          return (
            <path
              key={i}
              d={`M-20 ${y} C 80 ${y - 36}, 150 ${y + 22}, 220 ${y - 12} S 380 ${y - 42}, 420 ${y - 6}`}
            />
          );
        })}
      </g>
      <style jsx>{`
        .contours {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
          pointer-events: none;
        }
      `}</style>
    </svg>
  );
}
