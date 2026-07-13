"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import {
  StatTile,
  CategoryChip,
  Slider,
  Eyebrow,
  PageTitle,
  iconBtn,
} from "@/components/ui/kit";
import { findTrip } from "@/lib/seed";
import type { POICategory } from "@/lib/types";

const SETUP_CATEGORIES: POICategory[] = [
  "geology",
  "history",
  "ecology",
  "indigenous",
  "folklore",
  "industry",
  "astronomy",
];

export default function TripSetup() {
  const router = useRouter();
  const { prefs, toggleCategory, setDensity, startTrip } = useApp();
  const trip = findTrip("bishop-tahoe")!;

  const densityLabel =
    prefs.density < 0.33 ? "Selective" : prefs.density < 0.66 ? "Balanced" : "Everything";

  const cached = 18;
  const total = 28;
  const pct = Math.round((cached / total) * 100);

  const begin = () => {
    startTrip("bishop-tahoe");
    router.push("/trip/active");
  };

  return (
    <main className="wrap">
      {/* Back affordance */}
      <div style={{ marginBottom: 20 }}>
        <Link href="/trips" aria-label="Back to trips" style={iconBtn}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
      </div>

      {/* Header */}
      <header style={{ marginBottom: 28 }}>
        <Eyebrow color="var(--gold)">TRIP MODE · FROM GOOGLE MAPS</Eyebrow>
        <PageTitle>
          {trip.origin} → {trip.destination}
        </PageTitle>
      </header>

      {/* Stats */}
      <div style={{ display: "flex", gap: 12, marginBottom: 34 }}>
        <StatTile value="212" unit="mi" caption="DISTANCE" />
        <StatTile value="4h 20" unit="min" caption="DRIVE TIME" />
        <div
          style={{
            flex: 1,
            background: "var(--surface)",
            border: "1px solid var(--hairline)",
            borderRadius: 14,
            padding: "16px 14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span
              style={{
                fontFamily: "'Hanken Grotesk',sans-serif",
                fontWeight: 700,
                fontSize: 24,
                color: "var(--amber)",
              }}
            >
              28
            </span>
          </div>
          <div
            className="eyebrow"
            style={{ color: "var(--text-3)", marginTop: 4, letterSpacing: "0.1em" }}
          >
            STORIES
          </div>
        </div>
      </div>

      {/* Curiosity / categories */}
      <section style={{ marginBottom: 34 }}>
        <Eyebrow>WHAT ARE YOU CURIOUS ABOUT</Eyebrow>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {SETUP_CATEGORIES.map((cat) => (
            <CategoryChip
              key={cat}
              category={cat}
              selected={prefs.enabledCategories.includes(cat)}
              onClick={() => toggleCategory(cat)}
            />
          ))}
          {/* Non-functional "+3 more" pill, styled like an unselected chip */}
          <span
            aria-hidden="true"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "9px 14px",
              borderRadius: 999,
              background: "transparent",
              border: "1px solid var(--hairline)",
              color: "var(--text-3)",
              fontFamily: "'Hanken Grotesk',sans-serif",
              fontWeight: 600,
              fontSize: 14,
              opacity: 0.6,
            }}
          >
            +3 more
          </span>
        </div>
      </section>

      {/* Alert density */}
      <section style={{ marginBottom: 34 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 4,
          }}
        >
          <Eyebrow>ALERT DENSITY</Eyebrow>
          <span
            style={{
              fontFamily: "'Hanken Grotesk',sans-serif",
              fontWeight: 600,
              fontSize: 14,
              color: "var(--text-2)",
            }}
          >
            {densityLabel}
          </span>
        </div>
        <Slider value={prefs.density} onChange={setDensity} />
        <div
          className="mono"
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 10,
            fontSize: 12,
            color: "var(--text-3)",
          }}
        >
          <span>Fewer, only the best</span>
          <span>More, tell me everything</span>
        </div>
      </section>

      {/* Offline pre-cache card */}
      <section
        style={{
          background: "var(--surface)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--r-card)",
          padding: 16,
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span className="ring" aria-hidden="true" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "'Hanken Grotesk',sans-serif",
                fontWeight: 600,
                fontSize: 15,
                color: "var(--text-1)",
              }}
            >
              Downloading stories for offline
            </div>
            <div className="mono" style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3 }}>
              {cached} / {total} · works with no signal
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: 14,
            height: 3,
            borderRadius: 999,
            background: "var(--hairline)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              borderRadius: 999,
              background: "var(--gold)",
            }}
          />
        </div>
      </section>

      {/* Fixed bottom CTA */}
      <div className="cta-dock">
        <div className="cta-inner">
          <button className="start" onClick={begin}>
            Start trip
          </button>
        </div>
      </div>

      <style jsx>{`
        .wrap {
          position: relative;
          width: 100%;
          max-width: 480px;
          margin: 0 auto;
          min-height: 100dvh;
          padding: max(24px, env(safe-area-inset-top)) 24px 120px;
        }
        .ring {
          width: 22px;
          height: 22px;
          flex: none;
          border-radius: 999px;
          border: 2px solid var(--hairline);
          border-top-color: var(--gold);
          animation: spin 0.9s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .ring {
            animation: none;
            border-color: var(--gold);
          }
        }
        .cta-dock {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 20;
          display: flex;
          justify-content: center;
          padding: 12px 16px calc(20px + env(safe-area-inset-bottom));
          background: linear-gradient(
            to top,
            var(--bg) 55%,
            color-mix(in srgb, var(--bg) 0%, transparent)
          );
          pointer-events: none;
        }
        .cta-inner {
          width: 100%;
          max-width: 480px;
          padding: 0 8px;
          pointer-events: auto;
        }
        .start {
          width: 100%;
          height: 56px;
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
        .start:active {
          opacity: 0.9;
        }
      `}</style>
    </main>
  );
}
