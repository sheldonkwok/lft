import { useEffect, useState } from "react";
import { detect4x4, type IntervalPair, type Lap } from "./intervals";

type Activity = {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  start_date_local: string;
  sport_type: string;
};

type LapState = Lap[] | "loading" | "error";

type IntervalGroup = {
  type: "4x4";
  activity: Activity;
  pairs: IntervalPair[];
};

function formatDistance(meters: number): string {
  const miles = meters / 1609.344;
  return `${miles.toFixed(2)} mi`;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function avgSpeed(laps: Lap[]): number {
  return laps.reduce((sum, l) => sum + l.average_speed, 0) / laps.length;
}

function formatPace(metersPerSecond: number): string {
  if (metersPerSecond <= 0) return "—";
  const secondsPerMile = 1609.344 / metersPerSecond;
  const m = Math.floor(secondsPerMile / 60);
  const s = Math.round(secondsPerMile % 60);
  return `${m}:${String(s).padStart(2, "0")}/mi`;
}

async function fetchLaps(id: number): Promise<Lap[]> {
  const cached = localStorage.getItem(`laps_${id}`);
  if (cached) return JSON.parse(cached);

  const res = await fetch(`/api/strava/activities/${id}/laps`);
  if (!res.ok) throw new Error("Failed to fetch laps");
  const data: Lap[] = await res.json();
  localStorage.setItem(`laps_${id}`, JSON.stringify(data));
  return data;
}

export default function IntervalsPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");
  const [lapsMap, setLapsMap] = useState<Record<number, LapState>>({});

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

        const initialLoading = Object.fromEntries(
          data.map((a) => [a.id, "loading" as LapState]),
        );
        setLapsMap(initialLoading);

        for (let i = 0; i < data.length; i += 5) {
          const batch = data.slice(i, i + 5);
          await Promise.all(
            batch.map(async (a) => {
              try {
                const laps = await fetchLaps(a.id);
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

  const intervalGroups: IntervalGroup[] = [];
  const groupedIds = new Set<number>();

  for (const activity of activities) {
    const lapState = lapsMap[activity.id];
    if (!Array.isArray(lapState)) continue;
    const pairs = detect4x4(lapState);
    if (pairs) {
      intervalGroups.push({ type: "4x4", activity, pairs });
      groupedIds.add(activity.id);
    }
  }

  const ungroupedActivities = activities.filter((a) => !groupedIds.has(a.id));

  return (
    <div className="min-h-screen bg-black text-white font-mono p-6">
      <h1 className="text-xl font-bold mb-6">Recent Runs</h1>

      {status === "loading" && <p className="text-zinc-400">Loading...</p>}

      {status === "error" && (
        <p className="text-red-400">Failed to load activities.</p>
      )}

      {status === "done" && (
        <>
          {intervalGroups.length > 0 && (
            <section className="mb-8">
              <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-3">
                Grouped Intervals
              </h2>
              <ul className="space-y-3">
                {intervalGroups.map(({ activity, pairs, type }) => (
                  <li
                    key={activity.id}
                    className="border border-zinc-700 rounded p-4"
                  >
                    <div className="flex items-baseline gap-3 mb-3">
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                        {type}
                      </span>
                      <span className="font-bold">{activity.name}</span>
                      <span className="text-zinc-400 text-sm">
                        {formatDate(activity.start_date_local)}
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {pairs.map(({ fast, rest }, i) => (
                        <li
                          key={fast.lap_index}
                          className="text-xs flex gap-6 items-baseline"
                        >
                          <span className="text-zinc-500 w-8">{i + 1}</span>
                          <span className="text-white w-12">
                            {formatTime(fast.moving_time)}
                          </span>
                          <span className="text-zinc-300 w-20">
                            {formatPace(fast.average_speed)}
                          </span>
                          <span className="text-zinc-600 w-16">
                            rest {formatTime(rest.moving_time)}
                          </span>
                          <span className="text-zinc-500">
                            {formatPace(rest.average_speed)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 pt-2 border-t border-zinc-800 text-xs flex gap-6 items-baseline">
                      <span className="text-zinc-500 w-8" />
                      <span className="text-zinc-400 w-12">avg</span>
                      <span className="text-zinc-300 w-20">
                        {formatPace(avgSpeed(pairs.map((p) => p.fast)))}
                      </span>
                      <span className="text-zinc-600 w-16">rest avg</span>
                      <span className="text-zinc-500">
                        {formatPace(avgSpeed(pairs.map((p) => p.rest)))}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {ungroupedActivities.length > 0 && (
            <section>
              {intervalGroups.length > 0 && (
                <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-3">
                  Other Runs
                </h2>
              )}
              <ul className="space-y-3">
                {ungroupedActivities.map((a) => {
                  const lapState = lapsMap[a.id];
                  return (
                    <li
                      key={a.id}
                      className="border border-zinc-800 rounded p-4"
                    >
                      <div className="font-bold">{a.name}</div>
                      <div className="text-zinc-400 text-sm mt-1">
                        {formatDate(a.start_date_local)} &middot;{" "}
                        {formatDistance(a.distance)} &middot;{" "}
                        {formatTime(a.moving_time)}
                      </div>

                      <div className="mt-3 border-t border-zinc-800 pt-3">
                        {lapState === "loading" && (
                          <p className="text-zinc-500 text-xs">
                            Loading laps...
                          </p>
                        )}
                        {lapState === "error" && (
                          <p className="text-red-400 text-xs">
                            Failed to load laps.
                          </p>
                        )}
                        {Array.isArray(lapState) && (
                          <ul className="space-y-1">
                            {lapState.map((lap) => (
                              <li
                                key={lap.lap_index}
                                className="text-zinc-300 text-xs flex gap-4"
                              >
                                <span className="text-zinc-500 w-12">
                                  Lap {lap.lap_index}
                                </span>
                                <span>{formatDistance(lap.distance)}</span>
                                <span>{formatTime(lap.moving_time)}</span>
                                <span>{formatPace(lap.average_speed)}</span>
                                <span>
                                  {Math.round(lap.average_cadence)} spm
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {activities.length === 0 && (
            <p className="text-zinc-400">No recent runs found.</p>
          )}
        </>
      )}
    </div>
  );
}
