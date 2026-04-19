export function KPI({
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
