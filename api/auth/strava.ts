import { generateState, Strava } from "arctic";
import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { handle } from "hono/vercel";

export const config = { runtime: "edge" };

type Bindings = {
	STRAVA_CLIENT_ID: string;
	STRAVA_CLIENT_SECRET: string;
	STRAVA_REDIRECT_URI: string;
	NODE_ENV: string;
};

export const app = new Hono<{ Bindings: Bindings }>().basePath("/api");

app.get("/auth/strava", (c) => {
	const strava = new Strava(
		c.env.STRAVA_CLIENT_ID,
		c.env.STRAVA_CLIENT_SECRET,
		c.env.STRAVA_REDIRECT_URI,
	);
	const state = generateState();
	const url = strava.createAuthorizationURL(state, [
		"activity:read_all",
		"activity:write",
	]);

	setCookie(c, "strava_oauth_state", state, {
		httpOnly: true,
		secure: c.env.NODE_ENV === "production",
		sameSite: "Lax",
		maxAge: 600,
		path: "/",
	});

	return c.redirect(url.toString());
});

export default handle(app);
