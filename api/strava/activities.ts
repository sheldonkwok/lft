import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { handle } from "hono/vercel";

export const config = { runtime: "edge" };

export const app = new Hono().basePath("/api");

app.get("/strava/activities", async (c) => {
	const token = getCookie(c, "strava_access_token");
	if (!token) {
		return c.json({ error: "Not authenticated with Strava" }, 401);
	}

	const res = await fetch(
		"https://www.strava.com/api/v3/athlete/activities?per_page=20&sport_type=Run",
		{ headers: { Authorization: `Bearer ${token}` } },
	);

	const data = await res.json();
	return c.json(data, res.status as 200 | 401 | 403 | 500);
});

export default handle(app);
