import { describe, expect, it } from "vitest";
import {
  type Activity,
  buildGroups,
  detect4x4,
  detectDistanceInterval,
  distanceBucket,
  type Lap,
} from "./intervals";

function makeLap(index: number, movingTime: number, avgSpeed: number): Lap {
  return {
    lap_index: index,
    distance: movingTime * avgSpeed,
    moving_time: movingTime,
    average_speed: avgSpeed,
    average_cadence: 170,
  };
}

const FAST_TIME = 240;
const FAST_SPEED = 4.0;
const SLOW_SPEED = FAST_SPEED / 1.35; // ~2.96 m/s, >30% slower

function fastLap(index: number): Lap {
  return makeLap(index, FAST_TIME, FAST_SPEED);
}

function restLap(index: number): Lap {
  return makeLap(index, 180, SLOW_SPEED);
}

const VALID_4x4 = [
  fastLap(1),
  restLap(2),
  fastLap(3),
  restLap(4),
  fastLap(5),
  restLap(6),
  fastLap(7),
  restLap(8),
];

describe("detect4x4", () => {
  it("detects a valid 4x4 workout", () => {
    const result = detect4x4(VALID_4x4);
    expect(result).not.toBeNull();
    expect(result?.length).toBe(4);
  });

  it("returns null for only 3 valid pairs", () => {
    const laps = [
      fastLap(1),
      restLap(2),
      fastLap(3),
      restLap(4),
      fastLap(5),
      restLap(6),
    ];
    expect(detect4x4(laps)).toBeNull();
  });

  it("returns null when fast lap is immediately followed by another fast lap", () => {
    // lap1 is skipped (followed by another fast lap), leaving only 3 valid pairs
    const laps = [
      fastLap(1),
      fastLap(2), // no rest after lap1 — lap1 is orphaned
      restLap(3),
      fastLap(4),
      restLap(5),
      fastLap(6),
      restLap(7),
    ];
    // Only 3 valid pairs: (2,3), (4,5), (6,7)
    expect(detect4x4(laps)).toBeNull();
  });

  it("returns null when speed difference is less than 30%", () => {
    const tooFastRest = makeLap(2, 180, FAST_SPEED / 1.2); // only 20% slower
    const laps = [
      fastLap(1),
      tooFastRest,
      fastLap(3),
      restLap(4),
      fastLap(5),
      restLap(6),
      fastLap(7),
      restLap(8),
    ];
    // First pair fails speed check → only 3 valid pairs
    expect(detect4x4(laps)).toBeNull();
  });

  it("returns null when fast laps are outside the time buffer", () => {
    const tooLong = makeLap(1, 271, FAST_SPEED); // 271s > 270s threshold
    const laps = [
      tooLong,
      restLap(2),
      fastLap(3),
      restLap(4),
      fastLap(5),
      restLap(6),
      fastLap(7),
      restLap(8),
    ];
    expect(detect4x4(laps)).toBeNull();
  });

  it("accepts fast laps at the edge of the time buffer", () => {
    const edgeLow = makeLap(1, 235, FAST_SPEED); // 235s = MIN_TIME, valid
    const edgeHigh = makeLap(5, 270, FAST_SPEED); // 270s = MAX_TIME, valid
    const laps = [
      edgeLow,
      restLap(2),
      fastLap(3),
      restLap(4),
      edgeHigh,
      restLap(6),
      fastLap(7),
      restLap(8),
    ];
    const result = detect4x4(laps);
    expect(result).not.toBeNull();
    expect(result?.length).toBe(4);
  });

  it("returns null for an empty lap list", () => {
    expect(detect4x4([])).toBeNull();
  });

  it("returns null when there are more than 4 valid pairs", () => {
    const laps = [
      fastLap(1),
      restLap(2),
      fastLap(3),
      restLap(4),
      fastLap(5),
      restLap(6),
      fastLap(7),
      restLap(8),
      fastLap(9),
      restLap(10),
    ];
    expect(detect4x4(laps)).toBeNull();
  });

  it("detects 4 pairs with skipTimeCheck even when laps are outside the time window", () => {
    const outsideWindow = makeLap(1, 300, FAST_SPEED); // 300s > MAX_TIME
    const laps = [
      outsideWindow,
      restLap(2),
      outsideWindow,
      restLap(4),
      outsideWindow,
      restLap(6),
      outsideWindow,
      restLap(8),
    ];
    const result = detect4x4(laps, true);
    expect(result).not.toBeNull();
    expect(result?.length).toBe(4);
  });

  it("still requires exactly 4 pairs with skipTimeCheck", () => {
    const outsideWindow = makeLap(1, 300, FAST_SPEED);
    const fivePairs = [
      outsideWindow,
      restLap(2),
      outsideWindow,
      restLap(4),
      outsideWindow,
      restLap(6),
      outsideWindow,
      restLap(8),
      outsideWindow,
      restLap(10),
    ];
    expect(detect4x4(fivePairs, true)).toBeNull();
  });

  it("still returns null for empty laps even with skipTimeCheck", () => {
    expect(detect4x4([], true)).toBeNull();
  });
});

const DIST_FAST_SPEED = 5.0;
const DIST_SLOW_SPEED = DIST_FAST_SPEED / 1.35; // >30% slower
const DIST_METERS = 400;

function distFastLap(index: number, distance = DIST_METERS): Lap {
  return {
    lap_index: index,
    distance,
    moving_time: Math.round(distance / DIST_FAST_SPEED),
    average_speed: DIST_FAST_SPEED,
    average_cadence: 180,
  };
}

function distRestLap(index: number): Lap {
  return {
    lap_index: index,
    distance: 200,
    moving_time: Math.round(200 / DIST_SLOW_SPEED),
    average_speed: DIST_SLOW_SPEED,
    average_cadence: 160,
  };
}

describe("detectDistanceInterval", () => {
  it("detects a valid distance interval with 2+ pairs", () => {
    const laps = [
      distFastLap(1),
      distRestLap(2),
      distFastLap(3),
      distRestLap(4),
      distFastLap(5),
      distRestLap(6),
    ];
    const result = detectDistanceInterval(laps);
    expect(result).not.toBeNull();
    expect(result?.pairs.length).toBe(3);
    expect(result?.distance).toBeCloseTo(DIST_METERS, 0);
  });

  it("returns null for fewer than 3 pairs", () => {
    expect(detectDistanceInterval([distFastLap(1), distRestLap(2)])).toBeNull();
    expect(
      detectDistanceInterval([
        distFastLap(1),
        distRestLap(2),
        distFastLap(3),
        distRestLap(4),
      ]),
    ).toBeNull();
  });

  it("returns null when fast-lap distances exceed 10% variance", () => {
    const laps = [
      distFastLap(1, 400),
      distRestLap(2),
      distFastLap(3, 500), // ~15% off mean — outside 10% buffer and >50m
      distRestLap(4),
      distFastLap(5, 400),
      distRestLap(6),
    ];
    expect(detectDistanceInterval(laps)).toBeNull();
  });

  it("accepts small-distance intervals within 50m absolute buffer even if >10%", () => {
    // ~200m intervals: 200, 240, 200 — 40m off mean (20% but within 50m abs)
    const laps = [
      distFastLap(1, 200),
      distRestLap(2),
      distFastLap(3, 240),
      distRestLap(4),
      distFastLap(5, 200),
      distRestLap(6),
    ];
    const result = detectDistanceInterval(laps);
    expect(result).not.toBeNull();
    expect(result?.pairs.length).toBe(3);
  });

  it("returns null when speed difference is less than 30%", () => {
    const tooFastRest: Lap = {
      lap_index: 2,
      distance: 200,
      moving_time: 50,
      average_speed: DIST_FAST_SPEED / 1.2, // only 20% slower
      average_cadence: 170,
    };
    const laps = [
      distFastLap(1),
      tooFastRest,
      distFastLap(3),
      distRestLap(4),
      distFastLap(5),
      distRestLap(6),
    ];
    // First pair fails speed check → only 2 valid pairs remaining, below minimum
    expect(detectDistanceInterval(laps)).toBeNull();
  });

  it("ignores warmup/cooldown that don't meet speed threshold", () => {
    const warmup: Lap = {
      lap_index: 0,
      distance: 800,
      moving_time: 300,
      average_speed: 2.5, // slow warmup — not fast enough to pair
      average_cadence: 150,
    };
    const laps = [
      warmup,
      distFastLap(1),
      distRestLap(2),
      distFastLap(3),
      distRestLap(4),
      distFastLap(5),
      distRestLap(6),
    ];
    const result = detectDistanceInterval(laps);
    expect(result).not.toBeNull();
    expect(result?.pairs.length).toBe(3);
  });

  it("returns null for an empty lap list", () => {
    expect(detectDistanceInterval([])).toBeNull();
  });
});

// ─── distanceBucket ───────────────────────────────────────────────────────────

describe("distanceBucket", () => {
  it("rounds sub-1000m distances to nearest 50", () => {
    expect(distanceBucket(800)).toBe(800);
    expect(distanceBucket(825)).toBe(850);
  });

  it("rounds distances >= 1000m to nearest 100", () => {
    expect(distanceBucket(1234)).toBe(1200);
    expect(distanceBucket(1789)).toBe(1800);
  });
});

// ─── buildGroups ──────────────────────────────────────────────────────────────

function makeActivity(id: number, date: string): Activity {
  return {
    id,
    name: `Run ${id}`,
    distance: 8000,
    moving_time: 2400,
    start_date_local: date,
    sport_type: "Run",
  };
}

const VALID_4x4_LAPS = VALID_4x4;

function makeDistanceLapsForGroup(n: number): Lap[] {
  const laps: Lap[] = [];
  for (let i = 0; i < n; i++) {
    laps.push(distFastLap(i * 2));
    laps.push(distRestLap(i * 2 + 1));
  }
  return laps;
}

describe("buildGroups", () => {
  it("returns empty array for no activities", () => {
    expect(buildGroups([], {})).toEqual([]);
  });

  it("skips activities with no laps entry", () => {
    expect(buildGroups([makeActivity(1, "2026-03-01T08:00:00Z")], {})).toEqual(
      [],
    );
  });

  it("skips activities whose laps form no interval", () => {
    const laps: Lap[] = [makeLap(0, 1800, 2.8)];
    expect(
      buildGroups([makeActivity(1, "2026-03-01T08:00:00Z")], { 1: laps }),
    ).toEqual([]);
  });

  it("builds a 4x4 group from a single activity", () => {
    const groups = buildGroups([makeActivity(1, "2026-03-01T08:00:00Z")], {
      1: VALID_4x4_LAPS,
    });
    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe("4x4");
    expect(groups[0].title).toBe("4×4 Intervals");
    expect(groups[0].sessions[0].repCount).toBe(4);
  });

  it("groups two 4x4 activities together, sorted oldest first", () => {
    const a1 = makeActivity(1, "2026-03-01T08:00:00Z");
    const a2 = makeActivity(2, "2026-03-15T08:00:00Z");
    const groups = buildGroups([a2, a1], {
      1: VALID_4x4_LAPS,
      2: VALID_4x4_LAPS,
    });
    expect(groups).toHaveLength(1);
    expect(groups[0].sessions).toHaveLength(2);
    expect(groups[0].sessions[0].id).toBe(1);
    expect(groups[0].sessions[1].id).toBe(2);
  });

  it("builds a distance group from a single activity", () => {
    const groups = buildGroups([makeActivity(1, "2026-03-01T08:00:00Z")], {
      1: makeDistanceLapsForGroup(3),
    });
    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe(`dist_${distanceBucket(DIST_METERS)}`);
    expect(groups[0].title).toMatch(/Repeats$/);
  });

  it("creates separate groups for 4x4 and distance activities", () => {
    const groups = buildGroups(
      [
        makeActivity(1, "2026-03-01T08:00:00Z"),
        makeActivity(2, "2026-03-15T08:00:00Z"),
      ],
      { 1: VALID_4x4_LAPS, 2: makeDistanceLapsForGroup(3) },
    );
    expect(groups).toHaveLength(2);
  });

  it("classifies activity as 4x4 when name contains '4x4' and laps are outside the time window", () => {
    const outsideWindow = makeLap(0, 300, FAST_SPEED); // 300s > MAX_TIME
    const laps = [
      outsideWindow,
      restLap(2),
      outsideWindow,
      restLap(4),
      outsideWindow,
      restLap(6),
      outsideWindow,
      restLap(8),
    ];
    const activity: Activity = {
      id: 1,
      name: "4x4 Intervals",
      distance: 10000,
      moving_time: 3600,
      start_date_local: "2026-03-01T08:00:00Z",
      sport_type: "Run",
    };
    const groups = buildGroups([activity], { 1: laps });
    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe("4x4");
    expect(groups[0].sessions[0].repCount).toBe(4);
  });

  it("sorts groups by session count descending", () => {
    const groups = buildGroups(
      [
        makeActivity(1, "2026-03-01T08:00:00Z"),
        makeActivity(2, "2026-03-08T08:00:00Z"),
        makeActivity(3, "2026-03-15T08:00:00Z"),
      ],
      {
        1: VALID_4x4_LAPS,
        2: VALID_4x4_LAPS,
        3: makeDistanceLapsForGroup(3),
      },
    );
    expect(groups[0].id).toBe("4x4");
    expect(groups[1].id).toBe(`dist_${distanceBucket(DIST_METERS)}`);
  });
});
