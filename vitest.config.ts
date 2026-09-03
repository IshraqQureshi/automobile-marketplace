import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import path from "path";

export default defineConfig(({ mode }) => ({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    env: loadEnv(mode, process.cwd(), ""),
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
    // Tests run in a server-side Node context — resolve `server-only` the
    // same way Next.js's server bundler does (as a no-op), rather than
    // tripping its "imported from a Client Component" guard. Vitest runs
    // through Vite's SSR pipeline, which resolves deps via `ssr.resolve`,
    // not the client `resolve` block — both are set for safety.
    conditions: ["react-server"],
  },
  ssr: {
    resolve: {
      conditions: ["react-server"],
    },
  },
}));
