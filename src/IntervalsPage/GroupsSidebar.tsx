import type { WorkoutGroup } from "../intervals";

export function GroupsSidebar({
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
