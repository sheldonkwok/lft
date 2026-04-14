import { serve } from "@hono/node-server";
import { Hono } from "hono";

import { app as stravaCallback } from "./auth/strava/callback.ts";
import { app as stravaAuth } from "./auth/strava.ts";
import { app as hello } from "./hello.ts";
import { app as stravaSync } from "./strava/sync.ts";

const app = new Hono();
app.route("/", hello);
app.route("/", stravaAuth);
app.route("/", stravaCallback);
app.route("/", stravaSync);

serve({ fetch: app.fetch, port: 3000 }, () => {
	console.log("API dev server running at http://localhost:3000");
});
