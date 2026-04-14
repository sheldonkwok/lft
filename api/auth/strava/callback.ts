import { OAuth2RequestError, Strava } from "arctic";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { handle } from "hono/vercel";

export const config = { runtime: "edge" };

export const app = new Hono().basePath("/api");

app.get("/auth/strava/callback", async (c) => {
	const storedState = getCookie(c, "strava_oauth_state");
	const { code, state } = c.req.query();

	if (!storedState || !state || !code || storedState !== state) {
		return c.json({ error: "Invalid OAuth state" }, 400);
	}

	deleteCookie(c, "strava_oauth_state", { path: "/" });

	const strava = new Strava(
		process.env.STRAVA_CLIENT_ID ?? "",
		process.env.STRAVA_CLIENT_SECRET ?? "",
		process.env.STRAVA_REDIRECT_URI ?? "",
	);

	try {
		const tokens = await strava.validateAuthorizationCode(code);

		const cookieOptions = {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "Lax" as const,
			path: "/",
			maxAge: 60 * 60 * 24 * 30, // 30 days
		};

		setCookie(c, "strava_access_token", tokens.accessToken(), cookieOptions);
		setCookie(c, "strava_refresh_token", tokens.refreshToken(), cookieOptions);

		return c.redirect("/");
	} catch (e) {
		if (e instanceof OAuth2RequestError) {
			return c.json(
				{ error: "OAuth token exchange failed", detail: e.message },
				400,
			);
		}
		return c.json({ error: "Internal server error" }, 500);
	}
});

export default handle(app);
