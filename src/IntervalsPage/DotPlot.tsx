import type { WorkoutSession } from "../intervals";
import { fmtPace, fmtShortDate, norm } from "./utils";

export function DotPlot({ sessions }: { sessions: WorkoutSession[] }) {
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
