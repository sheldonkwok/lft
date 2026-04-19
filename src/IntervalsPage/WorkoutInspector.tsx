import type { WorkoutSession } from "../intervals";
import { RepBars } from "./RepBars";
import { Stat } from "./Stat";
import { fmtFullDate, fmtPace, fmtTime } from "./utils";

export function WorkoutInspector({
  session,
  isPR,
}: {
  session: WorkoutSession;
  isPR: boolean;
}) {
  return (
    <div
      style={{
        borderLeft: "1px solid var(--rule)",
        padding: "22px 22px 28px",
        background: "var(--bg)",
        height: "100%",
        overflowY: "auto",
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <div
          style={{
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--muted)",
          }}
        >
          Session
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: "var(--muted)",
          }}
        >
          #{session.id}
        </div>
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          color: "var(--ink)",
        }}
      >
        {session.title}
      </div>
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          color: "var(--muted)",
          marginTop: 4,
        }}
      >
        {fmtFullDate(session.date)}
      </div>

      {isPR && (
        <div
          style={{
            marginTop: 12,
            padding: "6px 10px",
            background: "var(--orange-soft)",
            color: "var(--orange-deep)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            display: "inline-block",
          }}
        >
          ★ Group avg PR
        </div>
      )}

      <div
        style={{
          marginTop: 20,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          borderTop: "1px solid var(--rule)",
          borderBottom: "1px solid var(--rule)",
          padding: "14px 0",
        }}
      >
        <Stat label="Avg /km" value={fmtPace(session.avgPace)} />
        <Stat label="Best /km" value={fmtPace(session.bestPace)} accent />
        <Stat label="Avg rest" value={fmtTime(session.avgRest)} />
        <Stat label="Range" value={`±${session.variance.toFixed(0)}s`} />
        <Stat label="Reps" value={String(session.repCount)} />
      </div>

      <div
        style={{
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontSize: 11,
          fontWeight: 600,
          color: "var(--muted)",
          marginTop: 20,
          marginBottom: 8,
        }}
      >
        Splits · /km pace
      </div>
      <RepBars session={session} />
    </div>
  );
}
