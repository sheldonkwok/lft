import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

function honoDevPlugin(): Plugin {
	return {
		name: "hono-dev",
		async configureServer(server) {
			const { getRequestListener } = await import("@hono/node-server");
			const { Hono } = await import("hono");
			const { app: hello } = await import("./api/hello.ts");
			const { app: stravaAuth } = await import("./api/auth/strava.ts");
			const { app: stravaCallback } = await import(
				"./api/auth/strava/callback.ts"
			);
			const { app: stravaSync } = await import("./api/strava/sync.ts");

			const app = new Hono();
			app.route("/", hello);
			app.route("/", stravaAuth);
			app.route("/", stravaCallback);
			app.route("/", stravaSync);

			const handler = getRequestListener(app.fetch);
			server.middlewares.use((req, res, next) => {
				if (!req.url?.startsWith("/api")) return next();
				return handler(req, res);
			});
		},
	};
}

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss(), honoDevPlugin()],
	server: { host: true },
});
