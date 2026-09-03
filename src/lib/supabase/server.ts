import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";

/**
 * Server-side Supabase client (Server Components, Route Handlers, Server Actions).
 * Reads the authenticated user's session from cookies — still subject to RLS,
 * this is NOT the service-role/admin client.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll called from a Server Component without middleware refreshing
            // the session — safe to ignore if session refresh happens elsewhere.
          }
        },
      },
    },
  );
}
