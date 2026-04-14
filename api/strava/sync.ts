import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { handle } from "hono/vercel";

export const config = { runtime: "edge" };

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
	const token = getCookie(c, "strava_access_token");
	if (!token) {
		return c.json({ error: "Not authenticated with Strava" }, 401);
	}

	const { exercises } = await c.req.json<{ exercises: ParsedExercise[] }>();

	const res = await fetch("https://www.strava.com/api/v3/activities", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			name: "Workout",
			sport_type: "WeightTraining",
			start_date_local: new Date().toISOString(),
			elapsed_time: 3600,
			description: formatDescription(exercises),
			hide_from_home: true,
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
