import { configDefaults, defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const alias = { "@": path.resolve(import.meta.dirname, "./src") };

  return {
    test: {
      projects: [
        {
          test: {
            name: "server",
            environment: "node",
            include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
            // *.render.test.ts run in the "render" project below.
            exclude: [...configDefaults.exclude, "src/**/*.render.test.ts"],
            env,
          },
          resolve: {
            alias,
            // Tests run in a server-side Node context — resolve `server-only` the
            // same way Next.js's server bundler does (as a no-op), rather than
            // tripping its "imported from a Client Component" guard. Vitest runs
            // through Vite's SSR pipeline, which resolves deps via `ssr.resolve`,
            // not the client `resolve` block — both are set for safety.
            //
            // Scoped to this project only: it changes package export resolution
            // (react-dom/server, for one, throws under this condition), so a test
            // that needs the normal React entry points goes in a
            // `*.render.test.ts` file instead.
            conditions: ["react-server"],
          },
          ssr: {
            resolve: {
              conditions: ["react-server"],
            },
          },
        },
        {
          test: {
            name: "render",
            environment: "node",
            include: ["src/**/*.render.test.ts"],
            env,
          },
          resolve: { alias },
        },
      ],
    },
  };
});
