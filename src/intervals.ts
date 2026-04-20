export type Lap = {
  lap_index: number;
  distance: number;
  moving_time: number;
  average_speed: number;
  average_cadence: number;
};

export type IntervalPair = {
  fast: Lap;
  rest: Lap;
};

export type Activity = {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  start_date_local: string;
  sport_type: string;
};

export type WorkoutSession = {
  id: number;
  date: string;
  title: string;
  reps: number[]; // pace in s/km for each fast lap
  restTimes: number[]; // moving_time (s) for rest laps
  avgPace: number; // avg pace in s/km
  bestPace: number; // fastest pace in s/km (lowest value)
  worstPace: number;
  variance: number; // worstPace - bestPace
  avgRest: number; // avg rest lap duration in s
  repCount: number;
};

export type WorkoutGroup = {
  id: string;
  type: "4x4" | "distance";
  title: string;
  structure: string;
  distance?: number;
  sessions: WorkoutSession[]; // oldest → newest
};

const MIN_TIME = 235; // 3m55s
const MAX_TIME = 270; // 4m30s
const SPEED_THRESHOLD = 1.3;
const DISTANCE_BUFFER = 0.05;
const DISTANCE_BUFFER_ABS = 50; // 0.05km in meters

function isFastLap(lap: Lap): boolean {
  return lap.moving_time >= MIN_TIME && lap.moving_time <= MAX_TIME;
}

export function detect4x4(
  laps: Lap[],
  skipTimeCheck = false,
): IntervalPair[] | null {
  const pairs: IntervalPair[] = [];

  for (let i = 0; i < laps.length; i++) {
    const lap = laps[i];
    if (!skipTimeCheck && !isFastLap(lap)) continue;

    const next = laps[i + 1];
    if (!next) continue;
    if (!skipTimeCheck && isFastLap(next)) continue;

    if (lap.average_speed < next.average_speed * SPEED_THRESHOLD) continue;

    pairs.push({ fast: lap, rest: next });
    i++; // skip rest lap
  }

  return pairs.length === 4 ? pairs : null;
}

export function detectDistanceInterval(
  laps: Lap[],
): { pairs: IntervalPair[]; distance: number } | null {
  const pairs: IntervalPair[] = [];

  for (let i = 0; i < laps.length - 1; i++) {
    const lap = laps[i];
    const next = laps[i + 1];
    if (lap.average_speed >= next.average_speed * SPEED_THRESHOLD) {
      pairs.push({ fast: lap, rest: next });
      i++;
    }
  }

  if (pairs.length < 3) return null;

  const distances = pairs.map((p) => p.fast.distance);
  const mean = distances.reduce((a, b) => a + b, 0) / distances.length;
  const allConsistent = distances.every(
    (d) =>
      Math.abs(d - mean) / mean <= DISTANCE_BUFFER ||
      Math.abs(d - mean) <= DISTANCE_BUFFER_ABS,
  );

  if (!allConsistent) return null;

  return { pairs, distance: mean };
}

export function distanceBucket(meters: number): number {
  if (meters < 1000) return Math.round(meters / 50) * 50;
  return Math.round(meters / 100) * 100;
}

function fmtDistanceLabel(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export function buildGroups(
  activities: Activity[],
  laps: Record<number, Lap[]>,
): WorkoutGroup[] {
  const groupMap = new Map<string, WorkoutGroup>();

  for (const activity of activities) {
    const activityLaps = laps[activity.id];
    if (!activityLaps) continue;

    let groupId: string;
    let type: "4x4" | "distance";
    let pairs: IntervalPair[];
    let distance: number | undefined;

    const nameIs4x4 = activity.name.toLowerCase().includes("4x4");
    const pairs4x4 =
      detect4x4(activityLaps) ??
      (nameIs4x4 ? detect4x4(activityLaps, true) : null);
    if (pairs4x4) {
      groupId = "4x4";
      type = "4x4";
      pairs = pairs4x4;
    } else {
      const result = detectDistanceInterval(activityLaps);
      if (!result) continue;
      distance = distanceBucket(result.distance);
      groupId = `dist_${distance}`;
      type = "distance";
      pairs = result.pairs;
    }

    const repPaces = pairs.map((p) => 1000 / p.fast.average_speed);
    const restTimes = pairs.map((p) => p.rest.moving_time);
    const avgPace = repPaces.reduce((a, b) => a + b, 0) / repPaces.length;
    const bestPace = Math.min(...repPaces);
    const worstPace = Math.max(...repPaces);

    const session: WorkoutSession = {
      id: activity.id,
      date: activity.start_date_local,
      title: activity.name,
      reps: repPaces,
      restTimes,
      avgPace,
      bestPace,
      worstPace,
      variance: worstPace - bestPace,
      avgRest: restTimes.reduce((a, b) => a + b, 0) / restTimes.length,
      repCount: pairs.length,
    };

    if (!groupMap.has(groupId)) {
      let title: string;
      let structure: string;
      if (type === "4x4") {
        title = "4×4 Intervals";
        structure = "4 × 4 min";
      } else {
        const dist = distance ?? 0;
        title = `${fmtDistanceLabel(dist)} Repeats`;
        structure = `${fmtDistanceLabel(dist)} × N`;
      }
      groupMap.set(groupId, {
        id: groupId,
        type,
        title,
        structure,
        distance,
        sessions: [],
      });
    }

    groupMap.get(groupId)?.sessions.push(session);
  }

  for (const g of groupMap.values()) {
    g.sessions.sort((a, b) => a.date.localeCompare(b.date));
  }

  return [...groupMap.values()].sort(
    (a, b) => b.sessions.length - a.sessions.length,
  );
}
