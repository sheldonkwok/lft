import { Strava } from "arctic";
import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";

const COOKIE_OPTS = {
	httpOnly: true,
	secure: process.env.NODE_ENV === "production",
	sameSite: "Lax" as const,
	path: "/",
	maxAge: 60 * 60 * 24 * 30,
};

export async function getValidStravaToken(c: Context): Promise<string | null> {
	const accessToken = getCookie(c, "strava_access_token");
	const expiry = getCookie(c, "strava_token_expiry");
	const refreshToken = getCookie(c, "strava_refresh_token");

	if (!accessToken || !refreshToken) return null;

	// If token is still valid (with 60s buffer), use it
	const expiresAt = expiry ? Number(expiry) : 0;
	if (Date.now() < expiresAt - 60_000) return accessToken;

	// Token expired — refresh it
	const strava = new Strava(
		process.env.STRAVA_CLIENT_ID ?? "",
		process.env.STRAVA_CLIENT_SECRET ?? "",
		process.env.STRAVA_REDIRECT_URI ?? "",
	);

	try {
		const tokens = await strava.refreshAccessToken(refreshToken);
		setCookie(c, "strava_access_token", tokens.accessToken(), COOKIE_OPTS);
		setCookie(
			c,
			"strava_token_expiry",
			tokens.accessTokenExpiresAt().getTime().toString(),
			COOKIE_OPTS,
		);
		setCookie(c, "strava_refresh_token", tokens.refreshToken(), COOKIE_OPTS);
		return tokens.accessToken();
	} catch {
		return null;
	}
}
