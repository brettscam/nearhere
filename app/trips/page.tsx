"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { PageTitle, Eyebrow, iconBtn } from "@/components/ui/kit";
import BottomNav from "@/components/ui/BottomNav";
import type { Trip } from "@/lib/types";

/* Gold with 0.14 alpha, for the offline-ready pill background. */
const GOLD_WASH = "color-mix(in srgb, var(--gold) 14%, transparent)";

/* ---------- Mini route thumbnail ---------- */
function RouteThumb({ size = 64 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      style={{ flex: "none", borderRadius: 14, background: "var(--surface-raised)" }}
      aria-hidden="true"
    >
      {/* gentle diagonal dotted route: bottom-left -> top-right */}
      <polyline
        points="14,50 26,40 32,30 40,22 50,14"
        fill="none"
        stroke="var(--gold)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="1 5"
      />
      {/* hollow start dot, bottom-left */}
      <circle cx="14" cy="50" r="4" fill="none" stroke="var(--text-3)" strokeWidth="2" />
      {/* filled gold end dot, top-right */}
      <circle cx="50" cy="14" r="4.5" fill="var(--gold)" />
    </svg>
  );
}

/* ---------- Status pill (upcoming trips) ---------- */
function OfflinePill({ offline }: { offline: boolean }) {
  if (offline) {
    return (
      <span
        className="mono"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          borderRadius: 999,
          fontSize: 11,
          letterSpacing: "0.06em",
          color: "var(--gold)",
          background: GOLD_WASH,
        }}
      >
        ✓ DOWNLOADED · OFFLINE READY
      </span>
    );
  }
  return (
    <span
      className="mono"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 999,
        fontSize: 11,
        letterSpacing: "0.06em",
        color: "var(--text-3)",
        border: "1px solid var(--hairline)",
      }}
    >
      ↓ DOWNLOAD FOR OFFLINE
    </span>
  );
}

const cardStyle: React.CSSProperties = {
  display: "flex",
  gap: 14,
  alignItems: "center",
  background: "var(--surface)",
  border: "1px solid var(--hairline)",
  borderRadius: 20,
  padding: 16,
  textDecoration: "none",
};

const routeTitleStyle: React.CSSProperties = {
  fontFamily: "'Hanken Grotesk',sans-serif",
  fontWeight: 700,
  fontSize: 17,
  letterSpacing: "-0.01em",
  color: "var(--text-1)",
};

const subLineStyle: React.CSSProperties = {
  fontSize: 12,
  letterSpacing: "0.06em",
  color: "var(--text-3)",
  marginTop: 4,
};

/* ---------- Upcoming trip card ---------- */
function UpcomingCard({ trip }: { trip: Trip }) {
  return (
    <Link href="/trip/setup" style={cardStyle}>
      <RouteThumb />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={routeTitleStyle}>
          {trip.origin} → {trip.destination}
        </div>
        <div className="mono" style={subLineStyle}>
          {trip.dateLabel} · {trip.distanceMiles} MI · {trip.storyCount} STORIES
        </div>
        <div style={{ marginTop: 12 }}>
          <OfflinePill offline={trip.offline} />
        </div>
      </div>
    </Link>
  );
}

/* ---------- Past trip card ---------- */
function PastCard({ trip }: { trip: Trip }) {
  return (
    <Link href="/trip/summary" style={cardStyle}>
      <RouteThumb />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={routeTitleStyle}>
          {trip.origin} → {trip.destination}
        </div>
        <div className="mono" style={subLineStyle}>
          {trip.dateLabel} · {trip.heardCount ?? 0} HEARD · {trip.distanceMiles} MI
        </div>
      </div>
      {/* decorative replay button */}
      <span
        style={{ ...iconBtn, color: "var(--amber)" }}
        aria-hidden="true"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4v5h5" />
          <path d="M4.5 13a7.5 7.5 0 1 0 1.2-5.3L4 9" />
        </svg>
      </span>
    </Link>
  );
}

export default function TripsPage() {
  const { trips } = useApp();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return trips;
    return trips.filter(
      (t) =>
        t.origin.toLowerCase().includes(q) ||
        t.destination.toLowerCase().includes(q),
    );
  }, [trips, query]);

  const upcoming = filtered.filter((t) => t.status === "upcoming");
  const past = filtered.filter((t) => t.status === "past");

  return (
    <main className="wrap">
      {/* Header */}
      <div className="header">
        <PageTitle>Trips</PageTitle>
        <Link
          href="/trip/setup"
          aria-label="New trip"
          style={{
            width: 44,
            height: 44,
            borderRadius: 999,
            border: "none",
            background: "var(--amber)",
            color: "var(--on-accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "none",
            textDecoration: "none",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Link>
      </div>

      {/* Search */}
      <div className="search">
        <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.2-3.2" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search places, routes, or trips"
          aria-label="Search trips"
        />
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <Eyebrow>UPCOMING</Eyebrow>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {upcoming.map((t) => (
              <UpcomingCard key={t.id} trip={t} />
            ))}
          </div>
        </section>
      )}

      {/* Past */}
      {past.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <Eyebrow>PAST</Eyebrow>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {past.map((t) => (
              <PastCard key={t.id} trip={t} />
            ))}
          </div>
        </section>
      )}

      {upcoming.length === 0 && past.length === 0 && (
        <p style={{ color: "var(--text-3)", marginTop: 28, fontSize: 15 }}>
          No trips match "{query}".
        </p>
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
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .search {
          position: relative;
          margin-top: 20px;
        }
        .search-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-3);
          pointer-events: none;
        }
        .search input {
          width: 100%;
          box-sizing: border-box;
          padding: 12px 16px 12px 44px;
          background: var(--surface);
          border: 1px solid var(--hairline);
          border-radius: 10px;
          color: var(--text-1);
          font-family: "Hanken Grotesk", sans-serif;
          font-size: 15px;
          outline: none;
        }
        .search input::placeholder {
          color: var(--text-3);
        }
        .search input:focus {
          border-color: var(--amber);
        }
      `}</style>
    </main>
  );
}
