import { Hono } from "hono";
import { handle } from "hono/vercel";
import { getValidStravaToken } from "../lib/strava";

export const config = { runtime: "nodejs" };

export const app = new Hono().basePath("/api");

app.get("/strava/activities", async (c) => {
  const token = await getValidStravaToken(c);
  if (!token) {
    return c.json({ error: "Not authenticated with Strava" }, 401);
  }

  const page = c.req.query("page") ?? "1";
  const after = Math.floor(Date.now() / 1000) - 3 * 30 * 24 * 3600;

  const res = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?per_page=200&page=${page}&after=${after}&sport_type=Run`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  const data = await res.json();
  return c.json(data, res.status as 200 | 401 | 403 | 500);
});

export default handle(app);
