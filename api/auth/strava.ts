import { generateState, Strava } from "arctic";
import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { handle } from "hono/vercel";

export const config = { runtime: "nodejs" };

export const app = new Hono().basePath("/api");

app.get("/auth/strava", (c) => {
  const strava = new Strava(
    process.env.STRAVA_CLIENT_ID ?? "",
    process.env.STRAVA_CLIENT_SECRET ?? "",
    process.env.STRAVA_REDIRECT_URI ?? "",
  );
  const state = generateState();
  const url = strava.createAuthorizationURL(state, [
    "activity:read_all",
    "activity:write",
  ]);

  setCookie(c, "strava_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    maxAge: 600,
    path: "/",
  });

  return c.redirect(url.toString());
});

export default handle(app);
