import { expect, type Page, test } from "@playwright/test";
import type { Lap } from "../src/intervals";

type Activity = {
  id: number;
  name: string;
  sport_type: string;
  start_date_local: string;
  distance: number;
  moving_time: number;
};

function make4x4Laps(): Lap[] {
  const laps: Lap[] = [];
  for (let i = 0; i < 4; i++) {
    // Fast lap: moving_time=240 (4 min), average_speed=5.0 m/s
    laps.push({
      lap_index: i * 2,
      distance: 1200,
      moving_time: 240,
      average_speed: 5.0,
      average_cadence: 170,
    });
    // Rest lap: average_speed=3.0 m/s (5.0 >= 3.0 * 1.3 = 3.9 ✓)
    laps.push({
      lap_index: i * 2 + 1,
      distance: 800,
      moving_time: 180,
      average_speed: 3.0,
      average_cadence: 140,
    });
  }
  return laps;
}

const ACTIVITIES: Activity[] = [
  {
    id: 1001,
    name: "4x4 Morning",
    sport_type: "Run",
    start_date_local: "2026-03-01T08:00:00Z",
    distance: 8000,
    moving_time: 2400,
  },
  {
    id: 1002,
    name: "4x4 Evening",
    sport_type: "Run",
    start_date_local: "2026-03-15T08:00:00Z",
    distance: 8000,
    moving_time: 2400,
  },
];

async function mockStrava(
  page: Page,
  activities: Activity[],
  opts: { delay?: number; status?: number } = {},
) {
  await page.route("**/api/strava/activities/*/laps", (route) =>
    route.fulfill({ json: make4x4Laps() }),
  );
  await page.route(
    (url) => url.pathname === "/api/strava/activities",
    async (route) => {
      if (opts.delay) await new Promise((r) => setTimeout(r, opts.delay));
      if (opts.status && opts.status !== 200) {
        return route.fulfill({
          status: opts.status,
          body: JSON.stringify({ error: "error" }),
        });
      }
      const pg = new URL(route.request().url()).searchParams.get("page") ?? "1";
      route.fulfill({ json: pg === "1" ? activities : [] });
    },
  );
}

test("redirects to Strava auth on 401", async ({ page }) => {
  await mockStrava(page, [], { status: 401 });
  const [request] = await Promise.all([
    page.waitForRequest(/\/api\/auth\/strava/),
    page.goto("/intervals"),
  ]);
  expect(request.url()).toContain("/api/auth/strava");
});

test("shows error state on server failure", async ({ page }) => {
  await mockStrava(page, [], { status: 500 });
  await page.goto("/intervals");
  await expect(page.getByText("Failed to load activities.")).toBeVisible();
});

test("shows loading state while fetching", async ({ page }) => {
  await mockStrava(page, ACTIVITIES, { delay: 500 });
  await page.goto("/intervals");
  await expect(page.getByText("Loading activities…")).toBeVisible();
});

test("detects and displays 4×4 interval group", async ({ page }) => {
  await mockStrava(page, ACTIVITIES);
  await page.goto("/intervals");
  await expect(page.getByText("4×4 Intervals").first()).toBeVisible();
});

test("lists sessions for the detected group", async ({ page }) => {
  await mockStrava(page, ACTIVITIES);
  await page.goto("/intervals");
  await expect(page.getByText("4×4 Intervals").first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: /4x4 Morning/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /4x4 Evening/i }),
  ).toBeVisible();
});

test("inspector shows stats for selected session", async ({ page }) => {
  await mockStrava(page, ACTIVITIES);
  await page.goto("/intervals");
  await expect(page.getByText("4×4 Intervals").first()).toBeVisible();
  // Inspector is visible as a sidebar at default Desktop Chrome (1280px) viewport
  await expect(page.getByText("Splits · /km pace")).toBeVisible();
  await expect(page.getByText("Reps", { exact: true })).toBeVisible();
  // Avg pace: 1000 / 5.0 m/s = 200 s/km = 3:20
  await expect(page.getByText("3:20").first()).toBeVisible();
});
