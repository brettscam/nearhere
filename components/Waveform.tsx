"use client";

/**
 * Waveform — a row of thin animated bars used under a deep-dive excerpt to
 * signal live audio narration. No spinners; the app's motion vocabulary.
 *
 * Colors run as a gradient across the bars: ember → amber → gold.
 * Heights animate via a shared @keyframes (scaleY) staggered per bar with an
 * inline animationDelay. When !playing (or prefers-reduced-motion) the bars
 * hold a low static height.
 *
 * #Preview usage:
 *   import Waveform from "@/components/Waveform";
 *   <Waveform playing />          // live, animated
 *   <Waveform playing={false} />  // paused, static low bars
 *   <Waveform playing bars={48} />
 */
export default function Waveform({
  playing = true,
  bars = 40,
}: {
  playing?: boolean;
  bars?: number;
}) {
  // Blend two hex colors in sRGB.
  const lerpHex = (a: string, b: string, t: number) => {
    const na = parseInt(a.slice(1), 16);
    const nb = parseInt(b.slice(1), 16);
    const ar = (na >> 16) & 255,
      ag = (na >> 8) & 255,
      ab = na & 255;
    const br = (nb >> 16) & 255,
      bg = (nb >> 8) & 255,
      bb = nb & 255;
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const bl = Math.round(ab + (bb - ab) * t);
    return `rgb(${r}, ${g}, ${bl})`;
  };

  // Design tokens (mirrors --ember / --amber / --gold) for per-bar blending;
  // var() can't be interpolated numerically, so we blend concrete hexes here.
  const EMBER = "#db6a40";
  const AMBER = "#ce7b2c";
  const GOLD = "#d9a62c";

  const barColor = (i: number) => {
    const t = bars <= 1 ? 0 : i / (bars - 1);
    // ember (0) → amber (0.5) → gold (1)
    return t < 0.5 ? lerpHex(EMBER, AMBER, t / 0.5) : lerpHex(AMBER, GOLD, (t - 0.5) / 0.5);
  };

  return (
    <div className="wf" role="img" aria-label={playing ? "Audio playing" : "Audio paused"}>
      {Array.from({ length: bars }).map((_, i) => {
        // A gentle envelope so the middle bars are tallest at rest.
        const env = 0.45 + Math.sin((i / (bars - 1)) * Math.PI) * 0.55;
        return (
          <span
            key={i}
            className={`bar${playing ? " on" : ""}`}
            style={{
              background: barColor(i),
              // stagger; wrap the delay so waves cycle across the row
              animationDelay: `${((i * 0.06) % 1.2).toFixed(2)}s`,
              // resting height scaled by the envelope
              ["--env" as any]: env.toFixed(3),
            }}
          />
        );
      })}

      <style jsx>{`
        .wf {
          display: flex;
          align-items: center;
          gap: 3px;
          height: 40px;
          width: 100%;
        }
        .bar {
          flex: 1 1 0;
          min-width: 2px;
          max-width: 3px;
          height: 100%;
          border-radius: 999px;
          transform: scaleY(calc(var(--env, 0.5) * 0.35));
          transform-origin: center;
          opacity: 0.9;
        }
        .bar.on {
          animation: wfPulse 1.1s ease-in-out infinite;
        }
        @keyframes wfPulse {
          0%,
          100% {
            transform: scaleY(calc(var(--env, 0.5) * 0.32));
          }
          50% {
            transform: scaleY(calc(var(--env, 0.5) * 1));
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .bar.on {
            animation: none;
            transform: scaleY(calc(var(--env, 0.5) * 0.4));
          }
        }
      `}</style>
    </div>
  );
}
