import { useEffect, useState } from "react";

type Activity = {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  start_date_local: string;
  sport_type: string;
};

type Lap = {
  lap_index: number;
  distance: number;
  moving_time: number;
  average_speed: number;
  average_cadence: number;
};

type LapState = Lap[] | "loading" | "error";

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

        // Fetch laps in batches of 5
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

  return (
    <div className="min-h-screen bg-black text-white font-mono p-6">
      <h1 className="text-xl font-bold mb-6">Recent Runs</h1>

      {status === "loading" && <p className="text-zinc-400">Loading...</p>}

      {status === "error" && (
        <p className="text-red-400">Failed to load activities.</p>
      )}

      {status === "done" && activities.length === 0 && (
        <p className="text-zinc-400">No recent runs found.</p>
      )}

      {status === "done" && activities.length > 0 && (
        <ul className="space-y-3">
          {activities.map((a) => {
            const lapState = lapsMap[a.id];
            return (
              <li key={a.id} className="border border-zinc-800 rounded p-4">
                <div className="font-bold">{a.name}</div>
                <div className="text-zinc-400 text-sm mt-1">
                  {formatDate(a.start_date_local)} &middot;{" "}
                  {formatDistance(a.distance)} &middot;{" "}
                  {formatTime(a.moving_time)}
                </div>

                <div className="mt-3 border-t border-zinc-800 pt-3">
                  {lapState === "loading" && (
                    <p className="text-zinc-500 text-xs">Loading laps...</p>
                  )}
                  {lapState === "error" && (
                    <p className="text-red-400 text-xs">Failed to load laps.</p>
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
                          <span>{Math.round(lap.average_cadence)} spm</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
