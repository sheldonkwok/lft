import { useEffect, useState } from "react";
import { type Activity, buildGroups, type Lap } from "../intervals";
import { DotPlot } from "./DotPlot";
import { GroupsSidebar } from "./GroupsSidebar";
import { KPI } from "./KPI";
import { LegendDots } from "./LegendDots";
import { SessionsList } from "./SessionsList";
import { useViewport } from "./useViewport";
import { fmtPace, fmtShortDate, median } from "./utils";
import { WorkoutInspector } from "./WorkoutInspector";

type LapState = Lap[] | "loading" | "error";

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
    async function loadActivities() {
      const fetchLaps = async (activities: Activity[]) => {
        setLapsMap((prev) => ({
          ...prev,
          ...Object.fromEntries(
            activities
              .filter((a) => !(a.id in prev))
              .map((a) => [a.id, "loading" as LapState]),
          ),
        }));
        for (let i = 0; i < activities.length; i += 5) {
          const batch = activities.slice(i, i + 5);
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
      };

      try {
        let page = 1;
        while (true) {
          const res = await fetch(`/api/strava/activities?page=${page}`);
          if (res.status === 401) {
            window.location.href = "/api/auth/strava";
            return;
          }
          if (!res.ok) throw new Error("Failed to fetch");
          const data: Activity[] = await res.json();
          if (!Array.isArray(data) || data.length === 0) break;

          const runs = data.filter((a) => a.sport_type === "Run");
          setActivities((prev) => {
            const existingIds = new Set(prev.map((a) => a.id));
            return [...prev, ...runs.filter((a) => !existingIds.has(a.id))];
          });
          if (page === 1) setStatus("done");

          fetchLaps(runs);
          page++;
        }
        if (page === 1) setStatus("done");
      } catch {
        setStatus("error");
      }
    }

    loadActivities();
  }, []);

  const resolvedLaps = Object.fromEntries(
    Object.entries(lapsMap).filter((e): e is [string, Lap[]] =>
      Array.isArray(e[1]),
    ),
  ) as Record<number, Lap[]>;
  const groups = buildGroups(activities, resolvedLaps);
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
