"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { StatTile, CategoryChip, Slider, Eyebrow, PageTitle, iconBtn } from "@/components/ui/kit";
import { geocodePlace, routeBetween, parseMapsUrl, type RouteResult } from "@/lib/directions";
import type { POICategory } from "@/lib/types";

const FILTERS: POICategory[] = ["geology", "history", "ecology", "indigenous", "folklore", "industry", "astronomy"];

export default function TripSetup() {
  const router = useRouter();
  const { prefs, toggleCategory, setDensity, startTrip } = useApp();

  const [from, setFrom] = useState("Bishop, CA");
  const [to, setTo] = useState("Lake Tahoe, CA");
  const [route, setRoute] = useState<RouteResult>({ distanceMiles: 212, durationText: "4h 20m" });
  const [routed, setRouted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [paste, setPaste] = useState("");

  const stories = Math.max(6, Math.round(route.distanceMiles / 7.5));
  const density = prefs.density;
  const densityLabel = density < 0.33 ? "Selective" : density < 0.66 ? "Balanced" : "Everything";

  async function buildRoute() {
    if (!from.trim() || !to.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const [a, b] = await Promise.all([geocodePlace(from), geocodePlace(to)]);
      if (!a || !b) {
        setError("Couldn't find one of those places. Try a city + state.");
        setLoading(false);
        return;
      }
      setFrom(a.name);
      setTo(b.name);
      const r = await routeBetween(a, b);
      setRoute(r);
      setRouted(true);
    } catch {
      setError("Routing is unavailable right now — using an estimate.");
    }
    setLoading(false);
  }

  function swap() {
    setFrom(to);
    setTo(from);
    setRouted(false);
  }

  function applyPaste() {
    const { from: f, to: t } = parseMapsUrl(paste);
    if (f) setFrom(f);
    if (t) setTo(t);
    setPasteOpen(false);
    setPaste("");
    setRouted(false);
  }

  return (
    <main className="wrap">
      <div className="topbar">
        <Link href="/trips" aria-label="Back" style={iconBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <button className="paste-toggle mono" onClick={() => setPasteOpen((v) => !v)}>
          {pasteOpen ? "close" : "paste Google Maps link"}
        </button>
      </div>

      <Eyebrow color="var(--gold)">TRIP MODE · FROM GOOGLE MAPS</Eyebrow>

      {pasteOpen && (
        <div className="paste-row">
          <input
            className="input mono"
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder="Paste a maps.google.com/maps/dir/… link"
            autoFocus
          />
          <button className="pill-btn" onClick={applyPaste}>Use</button>
        </div>
      )}

      {/* From → To directions entry */}
      <div className="directions">
        <div className="rail" aria-hidden="true">
          <span className="node origin" />
          <span className="line" />
          <span className="node dest" />
        </div>
        <div className="fields">
          <input
            className="input" value={from} onChange={(e) => { setFrom(e.target.value); setRouted(false); }}
            placeholder="From — your location" aria-label="Origin"
          />
          <input
            className="input" value={to} onChange={(e) => { setTo(e.target.value); setRouted(false); }}
            placeholder="To — destination" aria-label="Destination"
          />
        </div>
        <button className="swap" onClick={swap} aria-label="Swap origin and destination" style={iconBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 4v13M7 4L4 7M7 4l3 3M17 20V7M17 20l3-3M17 20l-3-3" />
          </svg>
        </button>
      </div>

      <button className="find" onClick={buildRoute} disabled={loading}>
        {loading ? "Finding your route…" : routed ? "Route ready ✓ · recalculate" : "Find stories along this route"}
      </button>
      {error && <p className="err mono">{error}</p>}

      <PageTitle>{cityOnly(from)} → {cityOnly(to)}</PageTitle>

      <div className="stats">
        <StatTile value={fmtMiles(route.distanceMiles)} unit="mi" caption="DISTANCE" />
        <StatTile value={route.durationText} caption="DRIVE TIME" />
        <div className="stat-amber">
          <StatTile value={String(stories)} caption="STORIES" />
        </div>
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
        <div className="dens-head">
          <Eyebrow>ALERT DENSITY</Eyebrow>
          <span className="dens-read">{densityLabel}</span>
        </div>
        <Slider value={density} onChange={setDensity} />
        <div className="dens-scale mono">
          <span>Fewer, only the best</span>
          <span>More, tell me everything</span>
        </div>
      </section>

      <div className="cache">
        <span className="ring" aria-hidden="true" />
        <div>
          <div className="cache-title">Downloading stories for offline</div>
          <div className="cache-sub mono">{Math.round(stories * 0.64)} / {stories} · works with no signal</div>
        </div>
      </div>
      <div className="cache-bar"><span style={{ width: "64%" }} /></div>

      <div className="dock">
        <button className="start" onClick={() => { startTrip("bishop-tahoe"); router.push("/trip/active"); }}>
          Start trip
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
        .err { color: var(--ember); font-size: 12px; margin: -8px 0 0; }
        .stats { display: flex; gap: 12px; }
        .stat-amber { flex: 1; display: flex; }
        .stat-amber :global(div > div > span:first-child) { color: var(--amber); }
        .chips { display: flex; flex-wrap: wrap; gap: 8px; }
        .more { display: inline-flex; align-items: center; padding: 9px 14px; border-radius: 999px; border: 1px solid var(--hairline); color: var(--text-3); font-size: 13px; }
        .dens-head { display: flex; align-items: center; justify-content: space-between; }
        .dens-read { color: var(--text-2); font-family: "Hanken Grotesk", sans-serif; font-size: 14px; }
        .dens-scale { display: flex; justify-content: space-between; color: var(--text-3); font-size: 12px; margin-top: 8px; }
        .cache { display: flex; align-items: center; gap: 14px; background: var(--surface); border: 1px solid var(--hairline); border-radius: var(--r-card); padding: 16px; }
        .cache-title { font-weight: 600; color: var(--text-1); }
        .cache-sub { color: var(--text-3); font-size: 13px; margin-top: 2px; }
        .cache-bar { height: 4px; border-radius: 999px; background: var(--hairline); overflow: hidden; margin-top: -12px; }
        .cache-bar span { display: block; height: 100%; background: var(--gold); }
        .ring { width: 22px; height: 22px; border-radius: 999px; border: 2px solid var(--gold); border-top-color: transparent; flex: none; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .ring { animation: none; } }
        .dock { position: fixed; left: 0; right: 0; bottom: 0; display: flex; justify-content: center; padding: 16px 24px calc(16px + env(safe-area-inset-bottom)); background: linear-gradient(to top, var(--bg) 60%, transparent); }
        .start { width: 100%; max-width: 432px; height: 56px; border: none; border-radius: var(--r-button); background: var(--amber); color: var(--on-accent); font-family: "Hanken Grotesk", sans-serif; font-weight: 700; font-size: 17px; }
      `}</style>
    </main>
  );
}

function cityOnly(s: string): string {
  return s.split(",")[0].trim() || s;
}
function fmtMiles(m: number): string {
  return m >= 100 ? String(Math.round(m)) : m.toFixed(0);
}
