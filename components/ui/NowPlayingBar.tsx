"use client";

import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { CatIcon } from "@/components/ui/kit";

/** A persistent mini-player above the bottom nav. Whenever a story is playing,
 *  this stays visible on every screen and taps back to the full player — so you
 *  can never get stranded a few screens deep. Hidden on the player itself and
 *  in eyes-free Solo mode. */
export default function NowPlayingBar() {
  const path = usePathname();
  const router = useRouter();
  const { nowPlaying, isPlaying, progress, togglePlay } = useApp();

  if (!nowPlaying) return null;
  // Hidden where a full player is already on screen.
  if (path === "/solo" || path === "/trip/active" || path === "/route") return null;

  return (
    <button
      onClick={() => router.push("/trip/active")}
      aria-label={`Now playing: ${nowPlaying.title}. Open player.`}
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: "calc(62px + env(safe-area-inset-bottom))",
        zIndex: 45,
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "min(480px, 100%)",
        margin: "0 auto",
        padding: "10px 14px",
        border: "none",
        borderTop: "1px solid var(--hairline)",
        background: "color-mix(in srgb, var(--surface) 94%, transparent)",
        backdropFilter: "blur(16px)",
        textAlign: "left",
      }}
    >
      {/* progress hairline across the top */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: 2,
          width: `${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%`,
          background: "var(--ember)",
          transition: "width 0.2s linear",
        }}
      />
      <CatIcon category={nowPlaying.category} size={38} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: "block",
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontWeight: 600,
            fontSize: 15,
            color: "var(--text-1)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {nowPlaying.title}
        </span>
        <span
          className="mono"
          style={{ fontSize: 11, color: "var(--ember)", letterSpacing: "0.06em" }}
        >
          {isPlaying ? "NOW PLAYING" : "PAUSED"} · TAP TO OPEN
        </span>
      </span>
      <span
        role="button"
        aria-label={isPlaying ? "Pause" : "Play"}
        onClick={(e) => {
          e.stopPropagation();
          togglePlay();
        }}
        style={{
          width: 40,
          height: 40,
          borderRadius: 999,
          background: "var(--amber)",
          color: "var(--on-accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "none",
        }}
      >
        {isPlaying ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </span>
    </button>
  );
}
