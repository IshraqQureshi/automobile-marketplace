import { defineConfig, devices } from "@playwright/test";

// Node's built-in .env loader (20.6+) — tests need NEXT_PUBLIC_SUPABASE_ANON_KEY
// to call the local Supabase API directly for fixture setup.
try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local may not exist in CI, where real env vars are injected instead.
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
