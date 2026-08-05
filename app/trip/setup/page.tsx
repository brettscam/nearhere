"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { StatTile, CategoryChip, Slider, Eyebrow, PageTitle, iconBtn } from "@/components/ui/kit";
import { parseMapsUrl } from "@/lib/directions";
import type { POICategory, Trip } from "@/lib/types";

const FILTERS: POICategory[] = ["geology", "history", "ecology", "indigenous", "folklore", "industry", "astronomy"];

export default function TripSetup() {
  const router = useRouter();
  const { prefs, toggleCategory, setDensity, startCustomTrip } = useApp();

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [paste, setPaste] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Grab the traveler's location (silent if already granted) to disambiguate
  // place names like "Salmon River" / "Hamilton" toward where they actually are.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => {},
      { timeout: 8000, maximumAge: 300000 },
    );
  }, []);

  const density = prefs.density;
  const densityLabel = density < 0.33 ? "Selective" : density < 0.66 ? "Balanced" : "Everything";

  async function buildTrip(): Promise<Trip | null> {
    if (!from.trim() || !to.trim()) {
      setError("Enter both a start and destination.");
      return null;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, lat: coords?.lat, lon: coords?.lon }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't build that route.");
        setLoading(false);
        return null;
      }
      const t = data.trip as Trip;
      setTrip(t);
      setFrom(t.origin);
      setTo(t.destination);
      setLoading(false);
      return t;
    } catch {
      setError("Network hiccup — try that again.");
      setLoading(false);
      return null;
    }
  }

  async function start() {
    setStarting(true);
    const t = trip ?? (await buildTrip());
    setStarting(false);
    if (t && t.stories.length) {
      startCustomTrip(t);
      router.push("/trip/active");
    } else if (t) {
      setError("Found the route, but no stories along it yet. Try a longer or more scenic route.");
    }
  }

  function swap() {
    setFrom(to);
    setTo(from);
    setTrip(null);
  }
  function applyPaste() {
    const { from: f, to: t } = parseMapsUrl(paste);
    if (f) setFrom(f);
    if (t) setTo(t);
    setPasteOpen(false);
    setPaste("");
    setTrip(null);
  }

  const miles = trip ? String(trip.distanceMiles) : "—";
  const driveTime = trip?.driveTime ?? "—";
  const storyCount = trip ? String(trip.storyCount) : "—";

  return (
    <main className="wrap">
      <div className="topbar">
        <Link href="/trips" aria-label="Back" style={iconBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </Link>
        <button className="paste-toggle mono" onClick={() => setPasteOpen((v) => !v)}>
          {pasteOpen ? "close" : "paste Google Maps link"}
        </button>
      </div>

      <Eyebrow color="var(--gold)">PLAN A TRIP</Eyebrow>

      {pasteOpen && (
        <div className="paste-row">
          <input className="input mono" value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="Paste a maps link or 'A to B'" autoFocus />
          <button className="pill-btn" onClick={applyPaste}>Use</button>
        </div>
      )}

      <div className="directions">
        <div className="rail" aria-hidden="true">
          <span className="node origin" /><span className="line" /><span className="node dest" />
        </div>
        <div className="fields">
          <input className="input" value={from} onChange={(e) => { setFrom(e.target.value); setTrip(null); }} placeholder="From — city, state" aria-label="Origin" />
          <input className="input" value={to} onChange={(e) => { setTo(e.target.value); setTrip(null); }} placeholder="To — city, state" aria-label="Destination" />
        </div>
        <button className="swap" onClick={swap} aria-label="Swap" style={iconBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 4v13M7 4L4 7M7 4l3 3M17 20V7M17 20l3-3M17 20l-3-3" /></svg>
        </button>
      </div>

      <button className="find" onClick={buildTrip} disabled={loading}>
        {loading ? "Finding stories along your route…" : trip ? "Route ready ✓ · recalculate" : "Find stories along this route"}
      </button>
      {error && <p className="err">{error}</p>}

      <PageTitle>{trip ? `${trip.origin} → ${trip.destination}` : "Where to?"}</PageTitle>

      <div className="stats">
        <StatTile value={miles} unit={trip ? "mi" : undefined} caption="DISTANCE" />
        <StatTile value={driveTime} caption="DRIVE TIME" />
        <div className="stat-amber"><StatTile value={storyCount} caption="STORIES" /></div>
      </div>

      <section>
        <Eyebrow>WHAT ARE YOU CURIOUS ABOUT</Eyebrow>
        <div className="chips">
          {FILTERS.map((c) => (
            <CategoryChip key={c} category={c} selected={prefs.enabledCategories.includes(c)} onClick={() => toggleCategory(c)} />
          ))}
          <span className="more mono">+3 more</span>
        </div>
      </section>

      <section>
        <div className="dens-head"><Eyebrow>ALERT DENSITY</Eyebrow><span className="dens-read">{densityLabel}</span></div>
        <Slider value={density} onChange={setDensity} />
        <div className="dens-scale mono"><span>Fewer, only the best</span><span>More, tell me everything</span></div>
      </section>

      <div className="dock">
        <button className="start" onClick={start} disabled={starting || loading || !from.trim() || !to.trim()}>
          {starting || loading ? "Building your trip…" : "Start trip"}
        </button>
      </div>

      <style jsx>{`
        .wrap { width: 100%; max-width: 480px; margin: 0 auto; min-height: 100dvh; display: flex; flex-direction: column; gap: 20px; padding: max(20px, env(safe-area-inset-top)) 24px 120px; }
        .topbar { display: flex; align-items: center; justify-content: space-between; }
        .paste-toggle { background: none; border: none; color: var(--gold); font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; }
        .paste-row { display: flex; gap: 8px; }
        .input { flex: 1; width: 100%; background: var(--surface); border: 1px solid var(--hairline); border-radius: var(--r-input); padding: 14px 16px; color: var(--text-1); font-family: "Hanken Grotesk", sans-serif; font-size: 16px; }
        .input::placeholder { color: var(--text-3); }
        .pill-btn { background: var(--amber); color: var(--on-accent); border: none; border-radius: var(--r-input); padding: 0 18px; font-weight: 700; }
        .directions { display: flex; align-items: stretch; gap: 12px; }
        .rail { display: flex; flex-direction: column; align-items: center; padding: 18px 0; }
        .node { width: 11px; height: 11px; border-radius: 999px; flex: none; }
        .origin { border: 2px solid var(--text-3); }
        .dest { background: var(--amber); }
        .line { flex: 1; width: 2px; background: var(--hairline); margin: 4px 0; }
        .fields { flex: 1; display: flex; flex-direction: column; gap: 8px; }
        .swap { align-self: center; }
        .find { width: 100%; background: var(--surface); border: 1px solid var(--hairline); color: var(--text-1); border-radius: var(--r-button); padding: 14px; font-family: "Hanken Grotesk", sans-serif; font-weight: 600; font-size: 15px; }
        .find:disabled { opacity: 0.7; }
        .err { color: var(--ember); font-size: 13px; margin: -8px 0 0; }
        .stats { display: flex; gap: 12px; }
        .stat-amber { flex: 1; display: flex; }
        .stat-amber :global(div > div > span:first-child) { color: var(--amber); }
        .chips { display: flex; flex-wrap: wrap; gap: 8px; }
        .more { display: inline-flex; align-items: center; padding: 9px 14px; border-radius: 999px; border: 1px solid var(--hairline); color: var(--text-3); font-size: 13px; }
        .dens-head { display: flex; align-items: center; justify-content: space-between; }
        .dens-read { color: var(--text-2); font-family: "Hanken Grotesk", sans-serif; font-size: 14px; }
        .dens-scale { display: flex; justify-content: space-between; color: var(--text-3); font-size: 12px; margin-top: 8px; }
        .dock { position: fixed; left: 0; right: 0; bottom: 0; display: flex; justify-content: center; padding: 16px 24px calc(16px + env(safe-area-inset-bottom)); background: linear-gradient(to top, var(--bg) 60%, transparent); }
        .start { width: 100%; max-width: 432px; height: 56px; border: none; border-radius: var(--r-button); background: var(--amber); color: var(--on-accent); font-family: "Hanken Grotesk", sans-serif; font-weight: 700; font-size: 17px; }
        .start:disabled { opacity: 0.6; }
      `}</style>
    </main>
  );
}
