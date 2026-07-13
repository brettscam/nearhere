"use client";

import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { Segmented, Toggle, Eyebrow, PageTitle } from "@/components/ui/kit";
import BottomNav from "@/components/ui/BottomNav";

/* ---------- shared bits ---------- */
const cardStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--hairline)",
  borderRadius: "var(--r-card)",
  overflow: "hidden",
};

const rowTitle: React.CSSProperties = {
  fontFamily: "'Hanken Grotesk',sans-serif",
  fontWeight: 600,
  fontSize: 16,
  letterSpacing: "-0.01em",
  color: "var(--text-1)",
};

const rowSub: React.CSSProperties = {
  fontSize: 13,
  color: "var(--text-3)",
  marginTop: 3,
};

/* A single settings row inside the grouped card. */
function SettingRow({
  title,
  sub,
  control,
}: {
  title: string;
  sub: string;
  control: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "16px 16px",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={rowTitle}>{title}</div>
        <div style={rowSub}>{sub}</div>
      </div>
      {control}
    </div>
  );
}

export default function SettingsPage() {
  const { prefs, setFrequency, toggleQuietHours, toggleSolo } = useApp();
  const router = useRouter();

  return (
    <main className="wrap">
      <PageTitle>Settings</PageTitle>

      {/* Alert frequency */}
      <section style={{ marginTop: 28 }}>
        <Eyebrow>ALERT FREQUENCY</Eyebrow>
        <Segmented
          options={[
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
          ]}
          value={prefs.frequency}
          onChange={setFrequency}
        />
      </section>

      {/* Grouped card: solo / quiet hours / voice */}
      <section style={{ marginTop: 24 }}>
        <div style={cardStyle}>
          <SettingRow
            title="Solo driving mode"
            sub="Hide the screen — audio only, eyes-free"
            control={
              <Toggle
                on={prefs.soloMode}
                onChange={() => {
                  const turningOn = !prefs.soloMode;
                  toggleSolo();
                  if (turningOn) router.push("/solo");
                }}
              />
            }
          />
          <div style={{ height: 1, background: "var(--hairline)" }} />
          <SettingRow
            title="Quiet hours"
            sub="No alerts 10:00 PM – 6:00 AM"
            control={<Toggle on={prefs.quietHours} onChange={toggleQuietHours} />}
          />
          <div style={{ height: 1, background: "var(--hairline)" }} />
          <SettingRow
            title="Voice"
            sub="Warm narrator (default)"
            control={
              <span
                className="mono"
                aria-disabled="true"
                style={{
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  color: "var(--text-3)",
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: "1px solid var(--hairline)",
                  opacity: 0.7,
                  flex: "none",
                }}
              >
                SOON
              </span>
            }
          />
        </div>
      </section>

      {/* Nearhere Plus subscription card */}
      <section style={{ marginTop: 16 }}>
        <div
          style={{
            ...cardStyle,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: 16,
            position: "relative",
            borderRadius: "var(--r-card)",
          }}
        >
          {/* subtle gold left accent */}
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              left: 0,
              top: 12,
              bottom: 12,
              width: 3,
              borderRadius: 999,
              background: "var(--gold)",
            }}
          />
          {/* gold circular badge / ring icon */}
          <span
            aria-hidden="true"
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              flex: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1.5px solid var(--gold)",
              background: "color-mix(in srgb, var(--gold) 14%, transparent)",
              color: "var(--gold)",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l2.5 5.2 5.7.8-4.1 4 1 5.6L12 21l-5.1 2.6 1-5.6-4.1-4 5.7-.8z" />
            </svg>
          </span>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "'Hanken Grotesk',sans-serif",
                fontWeight: 700,
                fontSize: 17,
                letterSpacing: "-0.01em",
                color: "var(--text-1)",
              }}
            >
              Nearhere Plus
            </div>
            <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 3 }}>
              Active · renews Aug 4
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 2, flex: "none" }}>
            <span
              style={{
                fontFamily: "'Hanken Grotesk',sans-serif",
                fontWeight: 700,
                fontSize: 26,
                color: "var(--text-1)",
              }}
            >
              $7
            </span>
            <span className="mono" style={{ fontSize: 12, color: "var(--text-3)" }}>
              /mo
            </span>
          </div>
        </div>
      </section>

      {/* Offline storage card */}
      <section style={{ marginTop: 16 }}>
        <div style={{ ...cardStyle, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <span
              style={{
                fontFamily: "'Hanken Grotesk',sans-serif",
                fontWeight: 700,
                fontSize: 16,
                letterSpacing: "-0.01em",
                color: "var(--text-1)",
              }}
            >
              Offline storage
            </span>
            <span className="mono" style={{ fontSize: 12, color: "var(--text-3)" }}>
              1.2 / 4.0 GB
            </span>
          </div>

          {/* thin progress bar ~30% */}
          <div
            style={{
              marginTop: 12,
              height: 6,
              borderRadius: 999,
              background: "var(--surface-raised)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: "30%",
                height: "100%",
                borderRadius: 999,
                background: "linear-gradient(90deg, var(--amber), var(--ember))",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 12 }}>
            <span style={{ fontSize: 13, color: "var(--text-3)" }}>
              Cached stories from 3 trips
            </span>
            <button
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                fontFamily: "'Hanken Grotesk',sans-serif",
                fontWeight: 600,
                fontSize: 14,
                color: "var(--ember)",
              }}
            >
              Manage
            </button>
          </div>
        </div>
      </section>

      <BottomNav />

      <style jsx>{`
        .wrap {
          position: relative;
          width: 100%;
          max-width: 480px;
          margin: 0 auto;
          min-height: 100dvh;
          padding: max(24px, env(safe-area-inset-top)) 24px 96px;
        }
      `}</style>
    </main>
  );
}
