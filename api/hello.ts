import { Hono } from "hono";
import { handle } from "hono/vercel";

export const app = new Hono().basePath("/api");

app.get("/hello", (c) => {
	return c.json({ message: "Hello World" });
});

export const config = { runtime: "edge" };

export default handle(app);
