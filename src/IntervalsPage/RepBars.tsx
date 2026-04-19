import type { WorkoutSession } from "../intervals";
import { fmtPace, norm } from "./utils";

export function RepBars({ session }: { session: WorkoutSession }) {
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
