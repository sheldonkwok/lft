export function Stat({
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
