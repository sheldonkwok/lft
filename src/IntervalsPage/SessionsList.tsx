import type { WorkoutSession } from "../intervals";
import { Sparkline } from "./Sparkline";
import { fmtPace, fmtShortDate, fmtTime } from "./utils";

export function SessionsList({
  sessions,
  selectedId,
  onPick,
}: {
  sessions: WorkoutSession[];
  selectedId: number;
  onPick: (id: number) => void;
}) {
  const allAvgs = sessions.map((s) => s.avgPace);
  const prAvg = Math.min(...allAvgs);

  return (
    <div style={{ border: "1px solid var(--rule)" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "64px 1fr 60px 60px 56px",
          padding: "8px 12px",
          background: "var(--bg-2)",
          borderBottom: "1px solid var(--rule)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontSize: 11,
          fontWeight: 600,
          color: "var(--muted)",
        }}
      >
        <div>Date</div>
        <div>Session</div>
        <div style={{ textAlign: "right" }}>Avg</div>
        <div style={{ textAlign: "right" }}>Best</div>
        <div style={{ textAlign: "right" }}>Trend</div>
      </div>
      <div style={{ maxHeight: 420, overflowY: "auto" }}>
        {sessions.map((s) => {
          const active = s.id === selectedId;
          const isPR = s.avgPace === prAvg;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onPick(s.id)}
              style={{
                width: "100%",
                display: "grid",
                gridTemplateColumns: "64px 1fr 60px 60px 56px",
                alignItems: "center",
                padding: "10px 12px",
                borderTop: 0,
                borderRight: 0,
                borderBottom: "1px solid var(--rule)",
                borderLeft: `3px solid ${active ? "var(--orange)" : "transparent"}`,
                background: active ? "var(--orange-soft)" : "var(--bg)",
                textAlign: "left",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "background 100ms",
              }}
              onMouseEnter={(e) => {
                if (!active)
                  (e.currentTarget as HTMLElement).style.background =
                    "var(--bg-2)";
              }}
              onMouseLeave={(e) => {
                if (!active)
                  (e.currentTarget as HTMLElement).style.background = active
                    ? "var(--orange-soft)"
                    : "var(--bg)";
              }}
            >
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  color: "var(--muted)",
                }}
              >
                {fmtShortDate(s.date)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: active ? 600 : 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: "var(--ink)",
                  }}
                >
                  {isPR && (
                    <span
                      style={{ color: "var(--orange-deep)", marginRight: 4 }}
                    >
                      ★
                    </span>
                  )}
                  {s.title}
                </div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    color: "var(--muted)",
                  }}
                >
                  {s.repCount} reps · rest ~{fmtTime(s.avgRest)}
                </div>
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontVariantNumeric: "tabular-nums",
                  fontSize: 12,
                  textAlign: "right",
                  color: "var(--ink)",
                }}
              >
                {fmtPace(s.avgPace)}
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontVariantNumeric: "tabular-nums",
                  fontSize: 12,
                  textAlign: "right",
                  color: "var(--orange-deep)",
                }}
              >
                {fmtPace(s.bestPace)}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Sparkline
                  values={s.reps.map((r) => -r)}
                  color={active ? "var(--orange-deep)" : "var(--ink)"}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
