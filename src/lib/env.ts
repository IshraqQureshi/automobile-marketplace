import { z } from "zod";

/**
 * Server-side env vars are validated lazily (inside supabaseServer/supabaseAdmin)
 * rather than at module load, so the module can be imported from client code
 * without crashing on missing server-only vars.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  // No real production domain has been confirmed yet — defaults to
  // localhost so SEO metadata (canonical/OG URLs, sitemap, robots.txt)
  // still generates valid, honest URLs in dev rather than a fabricated
  // guess. Set this in production's environment once the real domain is
  // known.
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
});

export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

export function getServerEnv() {
  return serverEnvSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
