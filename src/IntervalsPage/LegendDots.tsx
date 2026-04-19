export function LegendDots() {
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
