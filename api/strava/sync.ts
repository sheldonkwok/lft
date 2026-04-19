import { Hono } from "hono";
import { handle } from "hono/vercel";
import { getValidStravaToken } from "../lib/strava.js";

export const config = { runtime: "nodejs" };

export const app = new Hono().basePath("/api");

type ParsedSet = { weight: number; reps: number };
type ParsedExercise = { name: string; sets: ParsedSet[] };

function formatDescription(exercises: ParsedExercise[]): string {
  return exercises
    .map(
      (e) =>
        `${e.name}\n${e.sets.map((s) => `${s.weight}x${s.reps}`).join("\n")}`,
    )
    .join("\n\n");
}

app.post("/strava/sync", async (c) => {
  const token = await getValidStravaToken(c);
  if (!token) {
    return c.json({ error: "Not authenticated with Strava" }, 401);
  }

  const { exercises, startDateLocal, elapsedTime } = await c.req.json<{
    exercises: ParsedExercise[];
    startDateLocal: string;
    elapsedTime?: number;
  }>();

  const res = await fetch("https://www.strava.com/api/v3/activities", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Workout",
      sport_type: "WeightTraining",
      start_date_local: startDateLocal,
      elapsed_time: elapsedTime ?? 3600,
      description: formatDescription(exercises),
      hide_from_home: true,
      visibility: "only_me",
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    return c.json(
      { error: "Strava API error", detail: err },
      res.status as 400 | 401 | 403 | 500,
    );
  }

  const activity = (await res.json()) as { id: number };
  return c.json({
    id: activity.id,
    url: `https://www.strava.com/activities/${activity.id}`,
  });
});

export default handle(app);
