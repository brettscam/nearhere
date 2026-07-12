"use client";

import { useEffect, useRef } from "react";

export type MarkState = "listening" | "narrating" | "digging" | "idle";

/** The breathing proximity rings — the app's loading vocabulary, no spinners.
 *  Canvas-rendered so the motion stays smooth and cheap. */
export default function ProximityMark({
  state = "listening",
  size = 220,
}: {
  state?: MarkState;
  size?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cx = size / 2;
    const cy = size / 2;
    const R = size / 2;
    let raf = 0;
    const start = performance.now();

    const AMBER = "#ce7b2c";
    const GOLD = "#d9a62c";
    const EMBER = "#db6a40";
    const FAINT = "rgba(124,122,110,0.6)";

    function ring(r: number, color: string, lw: number, alpha: number) {
      ctx!.beginPath();
      ctx!.arc(cx, cy, r, 0, Math.PI * 2);
      ctx!.strokeStyle = color;
      ctx!.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx!.lineWidth = lw;
      ctx!.stroke();
      ctx!.globalAlpha = 1;
    }
    function dot(r: number, color: string, alpha = 1) {
      ctx!.beginPath();
      ctx!.arc(cx, cy, r, 0, Math.PI * 2);
      ctx!.fillStyle = color;
      ctx!.globalAlpha = alpha;
      ctx!.fill();
      ctx!.globalAlpha = 1;
    }

    function frame(now: number) {
      const t = reduce ? 1.2 : (now - start) / 1000;
      ctx!.clearRect(0, 0, size, size);
      const s = stateRef.current;

      if (s === "narrating") {
        // ember rings emit outward, staggered x3
        [0, 0.7, 1.4].forEach((delay) => {
          let p = (((t - delay) % 2.1) / 2.1 + 1) % 1;
          const eased = 1 - Math.pow(1 - p, 2);
          const rr = R * (0.14 + eased * 0.78);
          const a = p < 0.14 ? (p / 0.14) * 0.95 : Math.max(0, 0.95 * (1 - (p - 0.14) / 0.86));
          ring(rr, EMBER, 2.4, a);
        });
        const pulse = 1 + (Math.sin((t / 0.9) * 2 * Math.PI) + 1) / 2 * 0.28;
        dot(R * 0.12 * pulse, EMBER);
      } else if (s === "digging") {
        // outer dashed ring turning + rings drawing inward
        ctx!.save();
        ctx!.translate(cx, cy);
        ctx!.rotate(((t / 3.4) % 1) * Math.PI * 2);
        ctx!.beginPath();
        ctx!.setLineDash([10, 14]);
        ctx!.arc(0, 0, R * 0.66, 0, Math.PI * 2);
        ctx!.strokeStyle = FAINT;
        ctx!.lineWidth = 2;
        ctx!.stroke();
        ctx!.setLineDash([]);
        ctx!.restore();
        [
          { d: 0, c: GOLD },
          { d: 1.2, c: AMBER },
        ].forEach(({ d, c }) => {
          let p = (((t - d) % 2.4) / 2.4 + 1) % 1;
          const eased = p * p;
          const rr = R * (0.75 - eased * 0.63);
          const a = p < 0.22 ? (p / 0.22) * 0.9 : Math.max(0, 0.9 * (1 - (p - 0.22) / 0.78));
          ring(rr, c, 2.3, a);
        });
        dot(R * 0.11, AMBER, 0.9);
      } else {
        // listening / idle — slow 3s breath, staggered
        const idle = s === "idle";
        const breathe = (rf: number, delay: number, color: string, lw: number) => {
          const ph = Math.sin(((t - delay) / 3) * 2 * Math.PI);
          const scale = 0.86 + ((ph + 1) / 2) * 0.2;
          const a = (0.45 + ((ph + 1) / 2) * 0.5) * (idle ? 0.4 : 1);
          ring(R * rf * scale, color, lw, a);
        };
        breathe(0.62, 0.9, GOLD, 2);
        breathe(0.42, 0.45, AMBER, 2.2);
        breathe(0.24, 0, AMBER, 2.4);
        const ph = Math.sin((t / 3) * 2 * Math.PI);
        dot(R * 0.1 * (0.94 + ((ph + 1) / 2) * 0.18), AMBER, (idle ? 0.5 : 0.85) + ((ph + 1) / 2) * 0.15);
      }

      if (!reduce) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return <canvas ref={ref} style={{ width: size, height: size }} aria-hidden="true" />;
}
