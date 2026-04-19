import { Hono } from "hono";
import { handle } from "hono/vercel";
import { getValidStravaToken } from "../../../lib/strava";

export const config = { runtime: "edge" };

export const app = new Hono().basePath("/api");

app.get("/strava/activities/:id/laps", async (c) => {
  const token = await getValidStravaToken(c);
  if (!token) {
    return c.json({ error: "Not authenticated with Strava" }, 401);
  }

  const id = c.req.param("id");
  const res = await fetch(
    `https://www.strava.com/api/v3/activities/${id}/laps`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  const data = await res.json();
  return c.json(data, res.status as 200 | 401 | 403 | 404 | 500);
});

export default handle(app);
