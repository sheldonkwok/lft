import { createHash } from "node:crypto";
import { defineConfig, devices } from "@playwright/test";

const hash = createHash("sha1").update(process.cwd()).digest();
const port = 40000 + (hash.readUInt16BE(0) % 20000);
const baseURL = `http://localhost:${port}`;
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? "/usr/bin/chromium";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    launchOptions: { executablePath },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm dev --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
  },
});
