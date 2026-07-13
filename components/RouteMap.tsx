"use client";

import type { Story } from "@/lib/types";
import { CATEGORY } from "@/lib/categories";

/** A stylized dotted route with pins colored by playback status.
 *  ember = playing, gold = queued ahead, dim = heard. Tap a pin for its story. */
export default function RouteMap({
  stories,
  height = 320,
  onPin,
  activeId,
}: {
  stories: Story[];
  height?: number;
  onPin?: (s: Story) => void;
  activeId?: string;
}) {
  const W = 320;
  const H = height;
  // A gentle S-curve from bottom to top; map routeT (0 bottom → 1 top) to points.
  const pointAt = (t: number) => {
    const y = H - 24 - t * (H - 48);
    const x = W / 2 + Math.sin(t * Math.PI * 1.6) * (W * 0.22);
    return { x, y };
  };
  const dots = Array.from({ length: 60 }, (_, i) => pointAt(i / 59));

  const color = (s: Story) =>
    s.status === "playing" ? "var(--ember)" : s.status === "queued" ? "var(--gold)" : "var(--text-3)";

  return (
    <div style={{ position: "relative", width: "100%", borderRadius: 20, overflow: "hidden", background: "var(--surface)", border: "1px solid var(--hairline)" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }} aria-label="Route map">
        {/* faint contour lines */}
        <g fill="none" stroke="var(--text-3)" strokeWidth="1" opacity="0.12">
          {Array.from({ length: 6 }).map((_, i) => {
            const y = 30 + i * (H / 6);
            return <path key={i} d={`M0 ${y} C 80 ${y - 16}, 160 ${y + 14}, 240 ${y - 8} S 360 ${y - 20}, ${W} ${y - 4}`} />;
          })}
        </g>
        {/* route dotted line */}
        <polyline
          points={dots.map((d) => `${d.x},${d.y}`).join(" ")}
          fill="none" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 9" opacity="0.7"
        />
        {/* pins */}
        {stories.map((s) => {
          const p = pointAt(s.routeT);
          const isActive = s.id === activeId || s.status === "playing";
          return (
            <g key={s.id} transform={`translate(${p.x},${p.y})`} style={{ cursor: onPin ? "pointer" : "default" }}
               onClick={() => onPin?.(s)}>
              {isActive && <circle r="11" fill="none" stroke={color(s)} strokeWidth="2" opacity="0.6" />}
              <circle r="5.5" fill={color(s)} />
            </g>
          );
        })}
      </svg>
      <div style={{ position: "absolute", bottom: 10, left: 12, display: "flex", gap: 14 }}>
        <Legend color="var(--ember)" label="Playing" />
        <Legend color="var(--gold)" label="Queued" />
        <Legend color="var(--text-3)" label="Heard" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "'Space Mono',monospace", fontSize: 11, color: "var(--text-3)" }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
      {label}
    </span>
  );
}

export { CATEGORY };
