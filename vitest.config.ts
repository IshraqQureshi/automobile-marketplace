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
    //
    // WARNING: this is a whole-config setting, not scoped to the specific
    // test(s) that need it (currently just admin.integration.test.ts). It
    // changes package export resolution for every test in the suite. If a
    // future test imports browser-facing code (a React component, a hook,
    // src/lib/supabase/client.ts), it will resolve dependencies under this
    // server condition too, which can silently pick the wrong export variant.
    // Revisit with a scoped Vitest `projects` split once client-component
    // tests are added, rather than assuming this is safe indefinitely.
    conditions: ["react-server"],
  },
  ssr: {
    resolve: {
      conditions: ["react-server"],
    },
  },
}));
