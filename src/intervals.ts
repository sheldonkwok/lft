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
