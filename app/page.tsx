"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ProximityMark, { MarkState } from "@/components/ProximityMark";
import POICard from "@/components/POICard";
import { CATEGORY, categoryForFeature } from "@/lib/categories";
import {
  nearbyFeatures,
  reverseGeocode,
  detectionRadiusMeters,
  metersToMilesString,
} from "@/lib/geo";
import type { POI, GeoContext, Narration } from "@/lib/types";

type Status = "welcome" | "locating" | "listening" | "error";

export default function Home() {
  const [status, setStatus] = useState<Status>("welcome");
  const [ctx, setCtx] = useState<GeoContext | null>(null);
  const [poi, setPoi] = useState<POI | null>(null);
  const [foundCount, setFoundCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [demoMode, setDemoMode] = useState(false);

  const markState: MarkState =
    status === "welcome" ? "idle" : playing ? "narrating" : status === "locating" ? "digging" : "listening";

  // --- Core flow: locate → context → nearby → surface the top POI ---
  const scan = useCallback(async (lat: number, lon: number) => {
    setStatus("locating");
    const context = await reverseGeocode(lat, lon);
    setCtx(context);
    try {
      const feats = await nearbyFeatures(lat, lon, detectionRadiusMeters(0));
      setFoundCount(feats.length);
      const top = feats.find((f) => f.name) ?? feats[0];
      if (top) {
        setPoi({
          id: top.id,
          name: top.name ?? "A nearby place",
          lat: top.lat,
          lon: top.lon,
          distance: top.distance ?? 0,
          category: categoryForFeature(top),
          feature: top,
        });
      } else {
        setPoi(null);
      }
      setStatus("listening");
    } catch (e: any) {
      setError("Couldn't reach the map database. Try again in a moment.");
      setStatus("error");
    }
  }, []);

  const start = useCallback(() => {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("This browser can't share location.");
      setStatus("error");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => scan(pos.coords.latitude, pos.coords.longitude),
      () => {
        // Fall back to a scenic demo location (Mono Lake, CA).
        setDemoMode(true);
        scan(38.0169, -119.0269);
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }, [scan]);

  const tellMeMore = useCallback(async () => {
    if (!poi) return;
    setPlaying(true);
    setProgress(0.05);
    try {
      const res = await fetch("/api/narrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: poi.lat,
          lon: poi.lon,
          region: ctx?.summary,
          features: [poi.name, ...Object.entries(poi.feature.tags).slice(0, 3).map(([k, v]) => `${k}=${v}`)],
          type: "deep_dive",
        }),
      });
      const data = await res.json();
      const narration: Narration = data.narration;
      setPoi((p) => (p ? { ...p, narration } : p));
      speak(narration.narration, setProgress, () => {
        setPlaying(false);
        setProgress(1);
      });
    } catch {
      setPlaying(false);
    }
  }, [poi, ctx]);

  const statusText =
    status === "welcome"
      ? "Tap start and Nearhere will listen for stories around you."
      : status === "locating"
        ? "Finding your place in the world…"
        : status === "error"
          ? error ?? "Something went wrong."
          : poi
            ? `${foundCount} stories nearby — here's the closest.`
            : "All quiet here. Try moving somewhere with more history.";

  return (
    <main className="wrap">
      <Contours />

      <header className="top">
        <div>
          <div className="eyebrow" style={{ color: "var(--text-3)", letterSpacing: "0.24em" }}>
            {status === "welcome" ? "Nearhere" : "You're near"}
          </div>
          <div className="region">{ctx?.summary ?? "Nearhere"}</div>
        </div>
        <ThemeToggle />
      </header>

      <section className="center">
        <ProximityMark state={markState} size={230} />
        <p className="status" aria-live="polite">
          {statusText}
        </p>
        {demoMode && <p className="demo mono">demo location · Mono Lake, CA</p>}
      </section>

      <footer className="bottom">
        {poi && status === "listening" ? (
          <POICard
            poi={poi}
            playing={playing}
            progress={progress}
            onTellMeMore={tellMeMore}
            onDismiss={() => setPoi(null)}
          />
        ) : (
          <button className="start" onClick={start} disabled={status === "locating"}>
            {status === "locating" ? "Locating…" : status === "listening" ? "Rescan" : "Start listening"}
          </button>
        )}
      </footer>

      <style jsx>{`
        .wrap {
          position: relative;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          padding: max(24px, env(safe-area-inset-top)) 24px 32px;
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
          font-family: "Hanken Grotesk", sans-serif;
          font-weight: 600;
          font-size: 22px;
          color: var(--text-1);
          margin-top: 2px;
          max-width: 70vw;
        }
        .center {
          position: relative;
          z-index: 2;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 20px;
          text-align: center;
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
          color: var(--text-3);
          margin: 0;
        }
        .bottom {
          position: relative;
          z-index: 2;
          display: flex;
          justify-content: center;
        }
        .start {
          width: min(440px, 92vw);
          height: 56px;
          border: none;
          border-radius: var(--r-button);
          background: var(--amber);
          color: var(--on-accent);
          font-family: "Hanken Grotesk", sans-serif;
          font-weight: 700;
          font-size: 17px;
          transition: opacity 0.2s;
        }
        .start:disabled {
          opacity: 0.7;
        }
      `}</style>
    </main>
  );
}

// --- Web Speech narration ---
function speak(text: string, onProgress: (p: number) => void, onEnd: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    // No TTS: reveal text, fake a progress sweep.
    let p = 0;
    const iv = setInterval(() => {
      p += 0.05;
      onProgress(Math.min(p, 1));
      if (p >= 1) {
        clearInterval(iv);
        onEnd();
      }
    }, 300);
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1;
  u.pitch = 1;
  const total = Math.max(text.length, 1);
  u.onboundary = (e) => onProgress(Math.min(e.charIndex / total, 1));
  u.onend = () => onEnd();
  window.speechSynthesis.speak(u);
}

// --- Faint topographic contour background ---
function Contours() {
  return (
    <svg className="contours" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g fill="none" stroke="var(--text-3)" strokeWidth="1" opacity="0.14">
        {Array.from({ length: 9 }).map((_, i) => {
          const y = 90 + i * 78;
          return (
            <path
              key={i}
              d={`M-20 ${y} C 80 ${y - 34}, 150 ${y + 20}, 220 ${y - 10} S 380 ${y - 40}, 420 ${y - 6}`}
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
        }
      `}</style>
    </svg>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  useEffect(() => {
    const stored = (localStorage.getItem("nh-theme") as "light" | "dark" | null) ?? null;
    if (stored) {
      document.documentElement.setAttribute("data-theme", stored);
      setTheme(stored);
    }
  }, []);
  const toggle = () => {
    const next =
      (theme ??
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")) === "dark"
        ? "light"
        : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("nh-theme", next);
    setTheme(next);
  };
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      style={{
        width: 44,
        height: 44,
        borderRadius: 999,
        border: "1px solid var(--hairline)",
        background: "var(--surface)",
        color: "var(--text-2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "none",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
      </svg>
    </button>
  );
}
