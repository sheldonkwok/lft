import { useEffect, useState } from "react";
import {
  detect4x4,
  detectDistanceInterval,
  type IntervalPair,
  type Lap,
} from "./intervals";

// ─── Types ───────────────────────────────────────────────────────────────────

type Activity = {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  start_date_local: string;
  sport_type: string;
};

type LapState = Lap[] | "loading" | "error";

type WorkoutSession = {
  id: number;
  date: string;
  title: string;
  reps: number[]; // pace in s/km for each fast lap
  restTimes: number[]; // moving_time (s) for rest laps
  avgPace: number; // avg pace in s/km
  bestPace: number; // fastest pace in s/km (lowest value)
  worstPace: number;
  variance: number; // worstPace - bestPace
  avgRest: number; // avg rest lap duration in s
  repCount: number;
};

type WorkoutGroup = {
  id: string;
  type: "4x4" | "distance";
  title: string;
  structure: string;
  distance?: number;
  sessions: WorkoutSession[]; // oldest → newest
};

// ─── Formatting ──────────────────────────────────────────────────────────────

function fmtPace(secPerKm: number): string {
  if (!Number.isFinite(secPerKm) || secPerKm <= 0) return "—";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fmtShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function fmtFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtDistanceLabel(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function fmtTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function median(arr: number[]): number {
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function norm(v: number, vmin: number, vmax: number): number {
  return (v - vmin) / (vmax - vmin || 1);
}

function distanceBucket(meters: number): number {
  if (meters < 1000) return Math.round(meters / 50) * 50;
  return Math.round(meters / 100) * 100;
}

// ─── Data building ────────────────────────────────────────────────────────────

function buildGroups(
  activities: Activity[],
  lapsMap: Record<number, LapState>,
): WorkoutGroup[] {
  const groupMap = new Map<string, WorkoutGroup>();

  for (const activity of activities) {
    const lapState = lapsMap[activity.id];
    if (!Array.isArray(lapState)) continue;

    let groupId: string;
    let type: "4x4" | "distance";
    let pairs: IntervalPair[];
    let distance: number | undefined;

    const pairs4x4 = detect4x4(lapState);
    if (pairs4x4) {
      groupId = "4x4";
      type = "4x4";
      pairs = pairs4x4;
    } else {
      const result = detectDistanceInterval(lapState);
      if (!result) continue;
      distance = distanceBucket(result.distance);
      groupId = `dist_${distance}`;
      type = "distance";
      pairs = result.pairs;
    }

    const repPaces = pairs.map((p) => 1000 / p.fast.average_speed);
    const restTimes = pairs.map((p) => p.rest.moving_time);
    const avgPace = repPaces.reduce((a, b) => a + b, 0) / repPaces.length;
    const bestPace = Math.min(...repPaces);
    const worstPace = Math.max(...repPaces);

    const session: WorkoutSession = {
      id: activity.id,
      date: activity.start_date_local,
      title: activity.name,
      reps: repPaces,
      restTimes,
      avgPace,
      bestPace,
      worstPace,
      variance: worstPace - bestPace,
      avgRest: restTimes.reduce((a, b) => a + b, 0) / restTimes.length,
      repCount: pairs.length,
    };

    if (!groupMap.has(groupId)) {
      let title: string;
      let structure: string;
      if (type === "4x4") {
        title = "4×4 Intervals";
        structure = "4 × 4 min";
      } else {
        const dist = distance ?? 0;
        title = `${fmtDistanceLabel(dist)} Repeats`;
        structure = `${fmtDistanceLabel(dist)} × N`;
      }
      groupMap.set(groupId, {
        id: groupId,
        type,
        title,
        structure,
        distance,
        sessions: [],
      });
    }

    groupMap.get(groupId)?.sessions.push(session);
  }

  for (const g of groupMap.values()) {
    g.sessions.sort((a, b) => a.date.localeCompare(b.date));
  }

  return [...groupMap.values()].sort(
    (a, b) => b.sessions.length - a.sessions.length,
  );
}

// ─── Viewport hook ────────────────────────────────────────────────────────────

function useViewport() {
  const [w, setW] = useState(() => window.innerWidth);
  useEffect(() => {
    const onR = () => setW(window.innerWidth);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);
  return { isCompact: w < 1200, isNarrow: w < 900 };
}

// ─── DotPlot ─────────────────────────────────────────────────────────────────

function DotPlot({ sessions }: { sessions: WorkoutSession[] }) {
  const width = 820;
  const rowHeight = 22;
  const pad = { l: 76, r: 20, t: 24, b: 28 };
  const chartHeight = pad.t + pad.b + sessions.length * rowHeight;
  const W = width - pad.l - pad.r;

  const all = sessions.flatMap((s) => s.reps);
  if (all.length === 0) return null;
  const xmin = Math.min(...all) - 2;
  const xmax = Math.max(...all) + 2;
  const px = (v: number) => pad.l + norm(v, xmin, xmax) * W;

  const ticks: number[] = [];
  const tickStart = Math.ceil(xmin / 10) * 10;
  for (let v = tickStart; v <= xmax; v += 10) ticks.push(v);

  return (
    <svg
      aria-hidden="true"
      width="100%"
      viewBox={`0 0 ${width} ${chartHeight}`}
      style={{ display: "block" }}
    >
      {ticks.map((v) => (
        <g key={v}>
          <line
            x1={px(v)}
            x2={px(v)}
            y1={pad.t}
            y2={chartHeight - pad.b}
            stroke="var(--rule)"
            strokeDasharray="1 3"
          />
          <text
            x={px(v)}
            y={pad.t - 8}
            textAnchor="middle"
            fontFamily="'JetBrains Mono', monospace"
            fontSize="10"
            fill="var(--muted)"
          >
            {fmtPace(v)}
          </text>
        </g>
      ))}
      <line
        x1={pad.l}
        x2={width - pad.r}
        y1={pad.t - 2}
        y2={pad.t - 2}
        stroke="var(--ink)"
      />

      {sessions.map((session, rIdx) => {
        const y = pad.t + rIdx * rowHeight + rowHeight / 2;
        return (
          <g key={session.id}>
            <text
              x={pad.l - 10}
              y={y + 3}
              textAnchor="end"
              fontFamily="'JetBrains Mono', monospace"
              fontSize="10"
              fill="var(--ink-2)"
            >
              {fmtShortDate(session.date)}
            </text>
            <line
              x1={px(session.bestPace)}
              x2={px(session.worstPace)}
              y1={y}
              y2={y}
              stroke="var(--rule-2)"
              strokeWidth="1"
            />
            <line
              x1={px(session.avgPace)}
              x2={px(session.avgPace)}
              y1={y - 4}
              y2={y + 4}
              stroke="var(--ink)"
              strokeWidth="1.25"
            />
            {session.reps.map((r, i) => (
              <circle
                // biome-ignore lint/suspicious/noArrayIndexKey: static rep index
                key={i}
                cx={px(r)}
                cy={y}
                r={r === session.bestPace ? 3 : 2.2}
                fill={r === session.bestPace ? "var(--orange)" : "var(--ink)"}
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// ─── RepBars ─────────────────────────────────────────────────────────────────

function RepBars({ session }: { session: WorkoutSession }) {
  const width = 360;
  const pad = { l: 32, r: 72, t: 10, b: 10 };
  const rowH = 24;
  const chartHeight = pad.t + pad.b + session.reps.length * rowH;
  const W = width - pad.l - pad.r;
  const vmin = Math.min(...session.reps) - 5;
  const vmax = Math.max(...session.reps) + 5;

  return (
    <svg
      aria-hidden="true"
      width="100%"
      viewBox={`0 0 ${width} ${chartHeight}`}
      style={{ display: "block" }}
    >
      {session.reps.map((r, i) => {
        const y = pad.t + i * rowH;
        const barLen = norm(r, vmin, vmax) * W;
        const isBest = r === session.bestPace;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: rep index
          <g key={i}>
            <text
              x={pad.l - 8}
              y={y + rowH / 2 + 4}
              textAnchor="end"
              fontFamily="'JetBrains Mono', monospace"
              fontSize="10"
              fill="var(--muted)"
            >
              {String(i + 1).padStart(2, "0")}
            </text>
            <line
              x1={pad.l}
              x2={width - pad.r}
              y1={y + rowH / 2}
              y2={y + rowH / 2}
              stroke="var(--rule)"
              strokeDasharray="1 2"
            />
            <rect
              x={pad.l}
              y={y + 4}
              width={Math.max(2, barLen)}
              height={rowH - 8}
              fill={isBest ? "var(--orange)" : "var(--ink)"}
              opacity={isBest ? 1 : 0.85}
            />
            <text
              x={pad.l + barLen + 6}
              y={y + rowH / 2 + 4}
              fontFamily="'JetBrains Mono', monospace"
              fontSize="11"
              fill={isBest ? "var(--orange-deep)" : "var(--ink)"}
            >
              {fmtPace(r)}
              {isBest ? " ★" : ""}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Sparkline ───────────────────────────────────────────────────────────────

function Sparkline({
  values,
  width = 80,
  height = 22,
  color = "var(--ink)",
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (values.length < 2) return null;
  const vmin = Math.min(...values);
  const vmax = Math.max(...values);
  const x = (i: number) => (i / (values.length - 1)) * (width - 4) + 2;
  const y = (v: number) => height - 2 - norm(v, vmin, vmax) * (height - 4);
  const d = values
    .map(
      (v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`,
    )
    .join(" ");
  return (
    <svg
      aria-hidden="true"
      width={width}
      height={height}
      style={{ display: "block" }}
    >
      <path d={d} fill="none" stroke={color} strokeWidth="1.25" />
      <circle
        cx={x(values.length - 1)}
        cy={y(values[values.length - 1])}
        r="1.75"
        fill={color}
      />
    </svg>
  );
}

// ─── LegendDots ──────────────────────────────────────────────────────────────

function LegendDots() {
  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        fontSize: 11,
        color: "var(--muted)",
        flexWrap: "wrap",
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <svg aria-hidden="true" width="12" height="12">
          <circle cx="6" cy="6" r="2.2" fill="var(--ink)" />
        </svg>
        rep
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <svg aria-hidden="true" width="12" height="12">
          <circle cx="6" cy="6" r="3" fill="var(--orange)" />
        </svg>
        fastest rep
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <svg aria-hidden="true" width="14" height="12">
          <line
            x1="7"
            x2="7"
            y1="2"
            y2="10"
            stroke="var(--ink)"
            strokeWidth="1.25"
          />
        </svg>
        session avg
      </div>
    </div>
  );
}

// ─── KPI ─────────────────────────────────────────────────────────────────────

function KPI({
  label,
  value,
  sub,
  accent,
  last,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
  last?: boolean;
}) {
  return (
    <div
      style={{
        padding: "16px 18px 16px 0",
        borderRight: last ? "none" : "1px solid var(--rule)",
        minWidth: 0,
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
        {label}
      </div>
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontVariantNumeric: "tabular-nums",
          fontSize: 32,
          fontWeight: 500,
          letterSpacing: "-0.02em",
          marginTop: 6,
          color: accent ? "var(--orange-deep)" : "var(--ink)",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          color: "var(--muted)",
          marginTop: 4,
        }}
      >
        {sub}
      </div>
    </div>
  );
}

// ─── Stat ────────────────────────────────────────────────────────────────────

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontSize: 11,
          fontWeight: 600,
          color: "var(--muted)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontVariantNumeric: "tabular-nums",
          fontSize: 20,
          fontWeight: 500,
          marginTop: 2,
          color: accent ? "var(--orange-deep)" : "var(--ink)",
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ─── SessionsList ─────────────────────────────────────────────────────────────

function SessionsList({
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

// ─── WorkoutInspector ────────────────────────────────────────────────────────

function WorkoutInspector({
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

// ─── GroupsSidebar ────────────────────────────────────────────────────────────

function GroupsSidebar({
  groups,
  activeId,
  onPick,
}: {
  groups: WorkoutGroup[];
  activeId: string;
  onPick: (id: string) => void;
}) {
  return (
    <aside
      style={{
        borderRight: "1px solid var(--rule)",
        padding: "20px 18px 80px",
        background: "var(--bg)",
        minHeight: "100%",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 22,
        }}
      >
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 22 22">
          <rect
            x="0.5"
            y="0.5"
            width="21"
            height="21"
            rx="4"
            fill="var(--ink)"
          />
          <ellipse
            cx="11"
            cy="11"
            rx="7"
            ry="3.2"
            fill="none"
            stroke="var(--orange)"
            strokeWidth="1.25"
          />
          <ellipse
            cx="11"
            cy="11"
            rx="4.5"
            ry="1.8"
            fill="none"
            stroke="var(--orange)"
            strokeWidth="1"
            opacity="0.5"
          />
        </svg>
        <div
          style={{
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: "-0.01em",
            color: "var(--ink)",
          }}
        >
          Interval Log
        </div>
      </div>

      <div
        style={{
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontSize: 11,
          fontWeight: 600,
          color: "var(--muted)",
          marginBottom: 10,
        }}
      >
        Groups · Auto
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {groups.map((g) => {
          const active = g.id === activeId;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onPick(g.id)}
              style={{
                textAlign: "left",
                padding: "10px 10px 10px 12px",
                borderTop: 0,
                borderRight: 0,
                borderBottom: 0,
                borderLeft: `2px solid ${active ? "var(--orange)" : "transparent"}`,
                background: active ? "var(--bg-2)" : "transparent",
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 4,
                alignItems: "baseline",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "background 120ms",
              }}
              onMouseEnter={(e) => {
                if (!active)
                  (e.currentTarget as HTMLElement).style.background =
                    "var(--bg-2)";
              }}
              onMouseLeave={(e) => {
                if (!active)
                  (e.currentTarget as HTMLElement).style.background =
                    "transparent";
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: active ? 600 : 500,
                    color: "var(--ink)",
                  }}
                >
                  {g.title}
                </div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    color: "var(--muted)",
                    marginTop: 2,
                  }}
                >
                  {g.structure}
                </div>
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontVariantNumeric: "tabular-nums",
                  fontSize: 11,
                  color: "var(--muted)",
                }}
              >
                {String(g.sessions.length).padStart(2, "0")}
              </div>
            </button>
          );
        })}
        {groups.length === 0 && (
          <div
            style={{
              fontSize: 12,
              color: "var(--muted)",
              padding: "8px 12px",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Detecting…
          </div>
        )}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 18,
          left: 18,
          right: 18,
          fontSize: 10,
          color: "var(--muted)",
        }}
      >
        <div
          style={{
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--muted)",
            marginBottom: 6,
          }}
        >
          Source
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12">
            <circle
              cx="6"
              cy="6"
              r="5.5"
              fill="none"
              stroke="var(--muted)"
              strokeWidth="1"
            />
            <path
              d="M4.5 8 L6 4.5 L7.5 8 L6.6 8 L6 6.6 L5.4 8 Z"
              fill="var(--muted)"
            />
          </svg>
          <span>Strava</span>
        </div>
      </div>
    </aside>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function IntervalsPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");
  const [lapsMap, setLapsMap] = useState<Record<number, LapState>>({});
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(
    null,
  );
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isCompact, isNarrow } = useViewport();

  useEffect(() => {
    fetch("/api/strava/activities")
      .then(async (res) => {
        if (res.status === 401) {
          window.location.href = "/api/auth/strava";
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch");
        const data: Activity[] = await res.json();
        const runs = data.filter((a) => a.sport_type === "Run");
        setActivities(runs);
        setStatus("done");

        const initialLoading: Record<number, LapState> = Object.fromEntries(
          data.map((a) => [a.id, "loading" as LapState]),
        );
        setLapsMap(initialLoading);

        for (let i = 0; i < data.length; i += 5) {
          const batch = data.slice(i, i + 5);
          await Promise.all(
            batch.map(async (a) => {
              try {
                const cached = localStorage.getItem(`laps_${a.id}`);
                let laps: Lap[];
                if (cached) {
                  laps = JSON.parse(cached);
                } else {
                  const r = await fetch(`/api/strava/activities/${a.id}/laps`);
                  if (!r.ok) throw new Error("Failed to fetch laps");
                  laps = await r.json();
                  localStorage.setItem(`laps_${a.id}`, JSON.stringify(laps));
                }
                setLapsMap((prev) => ({ ...prev, [a.id]: laps }));
              } catch {
                setLapsMap((prev) => ({ ...prev, [a.id]: "error" }));
              }
            }),
          );
        }
      })
      .catch(() => setStatus("error"));
  }, []);

  const groups = buildGroups(activities, lapsMap);
  const resolvedGroupId = activeGroupId ?? groups[0]?.id ?? null;
  const group = groups.find((g) => g.id === resolvedGroupId) ?? null;
  const sessions = group?.sessions ?? [];
  const resolvedSessionId =
    selectedSessionId !== null &&
    sessions.some((s) => s.id === selectedSessionId)
      ? selectedSessionId
      : (sessions[sessions.length - 1]?.id ?? null);
  const session = sessions.find((s) => s.id === resolvedSessionId) ?? null;

  // Group-level stats
  const allAvgPaces = sessions.map((s) => s.avgPace);
  const prAvg = allAvgPaces.length > 0 ? Math.min(...allAvgPaces) : 0;
  const allBestPaces = sessions.map((s) => s.bestPace);
  const allTimeBest = allBestPaces.length > 0 ? Math.min(...allBestPaces) : 0;
  const allTimeBestSession = sessions.find((s) => s.bestPace === allTimeBest);
  const latestAvg = sessions[sessions.length - 1]?.avgPace ?? 0;
  const firstAvg = sessions[0]?.avgPace ?? latestAvg;
  const improvementPct =
    firstAvg > 0 ? ((firstAvg - latestAvg) / firstAvg) * 100 : 0;
  const prSession = sessions.find((s) => s.avgPace === prAvg);
  const medianRange =
    sessions.length > 0 ? median(sessions.map((s) => s.variance)) : 0;
  const isPR = session ? session.avgPace === prAvg : false;

  const gridCols = isNarrow
    ? "1fr"
    : isCompact
      ? "220px minmax(0, 1fr)"
      : "240px minmax(0, 1fr) 380px";

  const pageVars = {
    "--bg": "#F6F1E8",
    "--bg-2": "#EFE8DC",
    "--ink": "#14110E",
    "--ink-2": "#2A2621",
    "--muted": "#7A7268",
    "--rule": "#D9D1C2",
    "--rule-2": "#C7BEAD",
    "--orange": "#F47C3C",
    "--orange-soft": "#FBD9C3",
    "--orange-deep": "#C85E22",
  } as React.CSSProperties;

  const baseStyle: React.CSSProperties = {
    ...pageVars,
    background: "var(--bg)",
    color: "var(--ink)",
    fontFamily: "'Inter Tight', system-ui, sans-serif",
    WebkitFontSmoothing: "antialiased",
    minHeight: "100vh",
  };

  if (status === "loading") {
    return (
      <div
        style={{
          ...baseStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13,
            color: "var(--muted)",
          }}
        >
          Loading activities…
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        style={{
          ...baseStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ fontSize: 13, color: "var(--orange-deep)" }}>
          Failed to load activities.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        ...baseStyle,
        display: "grid",
        gridTemplateColumns: gridCols,
        position: "relative",
      }}
    >
      {/* Sidebar */}
      {!isNarrow && (
        <div style={{ position: "relative", minWidth: 0 }}>
          <GroupsSidebar
            groups={groups}
            activeId={resolvedGroupId ?? ""}
            onPick={(id) => {
              setActiveGroupId(id);
              setSelectedSessionId(null);
            }}
          />
        </div>
      )}

      {/* Main */}
      <main
        style={{
          padding: isNarrow ? "20px 18px 40px" : "28px 36px 40px",
          minWidth: 0,
        }}
      >
        {group ? (
          <>
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  minWidth: 0,
                  flex: "1 1 280px",
                }}
              >
                {isNarrow && (
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(true)}
                    style={{
                      padding: "6px 8px",
                      border: "1px solid var(--rule-2)",
                      background: "var(--bg)",
                      fontSize: 12,
                      alignSelf: "center",
                      cursor: "pointer",
                      color: "var(--ink)",
                      fontFamily: "inherit",
                    }}
                  >
                    ☰ Groups
                  </button>
                )}
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--orange-deep)",
                    }}
                  >
                    Group · Auto-detected
                  </div>
                  <h1
                    style={{
                      margin: "4px 0 0",
                      fontSize: isNarrow ? 30 : 40,
                      fontWeight: 600,
                      letterSpacing: "-0.025em",
                      color: "var(--ink)",
                    }}
                  >
                    {group.title}
                  </h1>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 12,
                      color: "var(--muted)",
                      marginTop: 6,
                    }}
                  >
                    {group.structure} · {group.sessions.length} sessions ·{" "}
                    {group.sessions.reduce((a, s) => a + s.repCount, 0)} reps
                  </div>
                </div>
              </div>
              {isCompact && session && (
                <button
                  type="button"
                  onClick={() => setInspectorOpen(true)}
                  style={{
                    fontSize: 12,
                    padding: "7px 12px",
                    border: "1px solid var(--rule-2)",
                    color: "var(--ink-2)",
                    background: "var(--bg)",
                    fontWeight: 500,
                    letterSpacing: "-0.01em",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    fontFamily: "inherit",
                  }}
                >
                  Inspect: {fmtShortDate(session.date)} →
                </button>
              )}
            </div>

            {/* KPI row */}
            {sessions.length > 0 && (
              <div
                style={{
                  marginTop: 24,
                  display: "grid",
                  gridTemplateColumns: isNarrow
                    ? "repeat(2, 1fr)"
                    : "repeat(4, 1fr)",
                  borderTop: "2px solid var(--ink)",
                  borderBottom: "1px solid var(--rule)",
                }}
              >
                <KPI
                  label="All-time best rep"
                  value={`${fmtPace(allTimeBest)}/km`}
                  sub={
                    allTimeBestSession
                      ? fmtShortDate(allTimeBestSession.date)
                      : "—"
                  }
                  accent
                />
                <KPI
                  label="Latest avg /km"
                  value={fmtPace(latestAvg)}
                  sub={`${improvementPct >= 0 ? "↓" : "↑"} ${Math.abs(improvementPct).toFixed(1)}% since first`}
                />
                <KPI
                  label="Best avg session"
                  value={fmtPace(prAvg)}
                  sub={prSession ? fmtShortDate(prSession.date) : "—"}
                />
                <KPI
                  label="Median range"
                  value={`±${medianRange.toFixed(0)}s`}
                  sub="rep-to-rep consistency"
                  last
                />
              </div>
            )}

            {/* Dot plot + sessions */}
            <section style={{ marginTop: 32 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "1fr"
                    : "minmax(0, 1.3fr) minmax(0, 1fr)",
                  gap: 28,
                  alignItems: "start",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      marginBottom: 10,
                      gap: 12,
                      flexWrap: "wrap",
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
                      Rep distribution · oldest → newest
                    </div>
                    <LegendDots />
                  </div>
                  <div
                    style={{
                      border: "1px solid var(--rule)",
                      padding: "10px 8px 4px",
                      background: "var(--bg)",
                    }}
                  >
                    <DotPlot sessions={sessions} />
                  </div>
                </div>

                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--muted)",
                      marginBottom: 10,
                    }}
                  >
                    Sessions · click to inspect
                  </div>
                  <SessionsList
                    sessions={[...sessions].reverse()}
                    selectedId={resolvedSessionId ?? -1}
                    onPick={(id) => {
                      setSelectedSessionId(id);
                      if (isCompact) setInspectorOpen(true);
                    }}
                  />
                </div>
              </div>
            </section>

            {/* Footer */}
            <div
              style={{
                marginTop: 40,
                borderTop: "1px solid var(--rule)",
                paddingTop: 14,
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: "var(--muted)",
                flexWrap: "wrap",
                gap: 8,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              <span>
                Interval Log · {group.title}
                {sessions.length > 0
                  ? ` · ${fmtShortDate(sessions[0].date)} → ${fmtShortDate(sessions[sessions.length - 1].date)}`
                  : ""}
              </span>
              <span>auto-grouped by repeat structure</span>
            </div>
          </>
        ) : (
          <div style={{ paddingTop: 60, textAlign: "center" }}>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13,
                color: "var(--muted)",
              }}
            >
              {Object.values(lapsMap).some((l) => l === "loading")
                ? "Detecting intervals…"
                : "No interval workouts found in recent activities."}
            </div>
          </div>
        )}
      </main>

      {/* Inspector panel (non-compact) */}
      {!isCompact && session && (
        <WorkoutInspector session={session} isPR={isPR} />
      )}

      {/* Inspector drawer (compact) */}
      {isCompact && inspectorOpen && session && (
        <>
          <button
            type="button"
            aria-label="Close inspector"
            onClick={() => setInspectorOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(20,17,14,0.28)",
              zIndex: 900,
              border: "none",
              padding: 0,
              cursor: "default",
            }}
          />
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "min(420px, 92vw)",
              background: "var(--bg)",
              zIndex: 901,
              overflowY: "auto",
              boxShadow: "-10px 0 40px -12px rgba(20,17,14,0.25)",
              ...pageVars,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                padding: "10px 12px 0",
              }}
            >
              <button
                type="button"
                onClick={() => setInspectorOpen(false)}
                style={{
                  fontSize: 16,
                  padding: "2px 8px",
                  color: "var(--muted)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>
            <WorkoutInspector session={session} isPR={isPR} />
          </div>
        </>
      )}

      {/* Mobile groups sheet */}
      {isNarrow && sidebarOpen && (
        <>
          <button
            type="button"
            aria-label="Close groups"
            onClick={() => setSidebarOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(20,17,14,0.28)",
              zIndex: 900,
              border: "none",
              padding: 0,
              cursor: "default",
            }}
          />
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              bottom: 0,
              width: "min(280px, 86vw)",
              background: "var(--bg)",
              zIndex: 901,
              overflowY: "auto",
              ...pageVars,
            }}
          >
            <GroupsSidebar
              groups={groups}
              activeId={resolvedGroupId ?? ""}
              onPick={(id) => {
                setActiveGroupId(id);
                setSelectedSessionId(null);
                setSidebarOpen(false);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
