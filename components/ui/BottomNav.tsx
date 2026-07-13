"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Listen", icon: "M4 12a8 8 0 0116 0M8 12a4 4 0 018 0M11 12a1 1 0 012 0" },
  { href: "/trips", label: "Trips", icon: "M4 7h16M4 12h16M4 17h10" },
  { href: "/route", label: "Route", icon: "M6 3v13a3 3 0 003 3h6M18 21V8a3 3 0 00-3-3H9" },
  { href: "/settings", label: "Settings", icon: "M12 15a3 3 0 100-6 3 3 0 000 6zM19 12l1.5 1-1 2-1.8-.4-1.4 1.2-.3 1.9h-2.2l-.3-1.9-1.4-1.2-1.8.4-1-2L5 12l-1.5-1 1-2 1.8.4L7.7 8l.3-1.9h2.2l.3 1.9 1.4 1.2 1.8-.4 1 2z" },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav
      style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 40,
        display: "flex", justifyContent: "space-around", alignItems: "center",
        padding: "10px 12px calc(10px + env(safe-area-inset-bottom))",
        background: "color-mix(in srgb, var(--bg) 88%, transparent)",
        backdropFilter: "blur(16px)", borderTop: "1px solid var(--hairline)",
      }}
    >
      {TABS.map((t) => {
        const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
        return (
          <Link
            key={t.href} href={t.href}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              color: active ? "var(--amber)" : "var(--text-3)", textDecoration: "none",
              fontFamily: "'Space Mono',monospace", fontSize: 10, letterSpacing: "0.08em",
              textTransform: "uppercase", padding: "4px 12px",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d={t.icon} />
            </svg>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
