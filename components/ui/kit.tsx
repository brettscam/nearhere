"use client";

import { useEffect, useState } from "react";
import type { POICategory } from "@/lib/types";
import { CATEGORY } from "@/lib/categories";

/* ---------- Category icon in a wash chip ---------- */
export function CatIcon({ category, size = 34 }: { category: POICategory; size?: number }) {
  const c = CATEGORY[category];
  return (
    <span
      style={{
        width: size, height: size, borderRadius: size * 0.32, flex: "none",
        background: hexA(c.base, 0.16), display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" fill="none"
        stroke={c.darkTint} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d={c.icon} />
      </svg>
    </span>
  );
}

/* ---------- Category filter chip ---------- */
export function CategoryChip({
  category, selected, onClick,
}: { category: POICategory; selected: boolean; onClick?: () => void }) {
  const c = CATEGORY[category];
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 14px",
        borderRadius: 999, cursor: "pointer",
        background: selected ? hexA(c.base, 0.18) : "transparent",
        border: `1px solid ${selected ? hexA(c.base, 0.5) : "var(--hairline)"}`,
        color: selected ? c.darkTint : "var(--text-3)",
        fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: 14,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 999, background: selected ? c.darkTint : "var(--text-3)" }} />
      {c.label}
    </button>
  );
}

/* ---------- Stat tile ---------- */
export function StatTile({ value, unit, caption }: { value: string; unit?: string; caption: string }) {
  return (
    <div style={{
      flex: 1, background: "var(--surface)", border: "1px solid var(--hairline)",
      borderRadius: 14, padding: "16px 14px",
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 700, fontSize: 24, color: "var(--text-1)" }}>{value}</span>
        {unit && <span className="mono" style={{ fontSize: 12, color: "var(--text-3)" }}>{unit}</span>}
      </div>
      <div className="eyebrow" style={{ color: "var(--text-3)", marginTop: 4, letterSpacing: "0.1em" }}>{caption}</div>
    </div>
  );
}

/* ---------- Segmented control ---------- */
export function Segmented<T extends string>({
  options, value, onChange,
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div style={{
      display: "flex", gap: 4, padding: 4, borderRadius: 12,
      background: "var(--surface)", border: "1px solid var(--hairline)",
    }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 9, border: "none", cursor: "pointer",
              background: active ? "var(--amber)" : "transparent",
              color: active ? "var(--on-accent)" : "var(--text-2)",
              fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: 15,
            }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Toggle switch ---------- */
export function Toggle({ on, onChange }: { on: boolean; onChange?: (v: boolean) => void }) {
  return (
    <button
      role="switch" aria-checked={on} onClick={() => onChange?.(!on)}
      style={{
        width: 46, height: 28, borderRadius: 999, border: "none", cursor: "pointer", padding: 3,
        background: on ? "var(--amber)" : "var(--n-500)", transition: "background 0.2s",
        display: "flex", justifyContent: on ? "flex-end" : "flex-start", alignItems: "center", flex: "none",
      }}>
      <span style={{ width: 22, height: 22, borderRadius: 999, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.3)" }} />
    </button>
  );
}

/* ---------- Slider ---------- */
export function Slider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="range" min={0} max={1} step={0.01} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={{ width: "100%", accentColor: "var(--amber)", height: 6 }}
      aria-label="Alert density"
    />
  );
}

/* ---------- Section eyebrow ---------- */
export function Eyebrow({ children, color = "var(--amber)" }: { children: React.ReactNode; color?: string }) {
  return (
    <div className="eyebrow" style={{ color, letterSpacing: "0.2em", marginBottom: 12 }}>{children}</div>
  );
}

/* ---------- Serif page title ---------- */
export function PageTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="serif" style={{ fontWeight: 500, fontSize: 34, letterSpacing: "-0.02em", margin: 0, color: "var(--text-1)" }}>
      {children}
    </h1>
  );
}

/* ---------- Theme toggle (sun) ---------- */
export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  useEffect(() => {
    const stored = (localStorage.getItem("nh-theme") as "light" | "dark" | null) ?? null;
    if (stored) { document.documentElement.setAttribute("data-theme", stored); setTheme(stored); }
  }, []);
  const toggle = () => {
    const current = theme ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("nh-theme", next);
    setTheme(next);
  };
  return (
    <button onClick={toggle} aria-label="Toggle theme" style={iconBtn}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
      </svg>
    </button>
  );
}

export const iconBtn: React.CSSProperties = {
  width: 44, height: 44, borderRadius: 999, border: "1px solid var(--hairline)",
  background: "var(--surface)", color: "var(--text-2)", display: "flex",
  alignItems: "center", justifyContent: "center", flex: "none", cursor: "pointer",
};

/* ---------- helpers ---------- */
export function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
