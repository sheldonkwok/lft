import { describe, expect, it } from "vitest";
import { detect4x4, type Lap } from "./intervals";

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
    const tooLong = makeLap(1, 248, FAST_SPEED); // 248s > 247.2s threshold
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
    const edgeLow = makeLap(1, 233, FAST_SPEED); // 240 * 0.97 ≈ 232.8 → 233 is valid
    const edgeHigh = makeLap(5, 247, FAST_SPEED); // 240 * 1.03 ≈ 247.2 → 247 is valid
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
});
