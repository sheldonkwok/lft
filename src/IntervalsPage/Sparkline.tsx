import { norm } from "./utils";

export function Sparkline({
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
