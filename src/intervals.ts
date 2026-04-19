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

const FOUR_MIN = 240;
const TIME_BUFFER = 0.03;
const SPEED_THRESHOLD = 1.3;
const DISTANCE_BUFFER = 0.05;

const MIN_TIME = FOUR_MIN * (1 - TIME_BUFFER);
const MAX_TIME = FOUR_MIN * (1 + TIME_BUFFER);

function isFastLap(lap: Lap): boolean {
  return lap.moving_time >= MIN_TIME && lap.moving_time <= MAX_TIME;
}

export function detect4x4(laps: Lap[]): IntervalPair[] | null {
  const pairs: IntervalPair[] = [];

  for (let i = 0; i < laps.length; i++) {
    const lap = laps[i];
    if (!isFastLap(lap)) continue;

    const next = laps[i + 1];
    if (!next || isFastLap(next)) continue;

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

  if (pairs.length < 2) return null;

  const distances = pairs.map((p) => p.fast.distance);
  const mean = distances.reduce((a, b) => a + b, 0) / distances.length;
  const allConsistent = distances.every(
    (d) => Math.abs(d - mean) / mean <= DISTANCE_BUFFER,
  );

  if (!allConsistent) return null;

  return { pairs, distance: mean };
}
