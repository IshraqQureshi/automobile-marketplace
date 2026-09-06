import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Refreshes the Supabase auth session on every request that passes through
 * src/proxy.ts (Next.js's "middleware" convention, renamed to "proxy" in
 * Next.js 16). Without this, Server Components alone cannot write cookies,
 * so an expired access token would never get refreshed.
 *
 * IMPORTANT: do not add logic between createServerClient and the call to
 * supabase.auth.getUser() below — that call is what actually triggers the
 * refresh, and its result must not be discarded.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and getUser — see note above.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ADM-003 (User Management): an admin can suspend a user's account
  // (profiles.is_active = false) at any time, including mid-session. RLS
  // alone doesn't enforce this for anything other than the profiles table
  // itself, so without a check here a suspended user's existing session
  // would otherwise keep working until its refresh token naturally expires
  // (effectively indefinitely) — this is the one chokepoint that already
  // runs on every request, so it's where "suspended" actually takes effect
  // immediately rather than only blocking a future login attempt.
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("is_active").eq("id", user.id).single();
    if (profile && !profile.is_active) {
      await supabase.auth.signOut();
    }
  }

  return supabaseResponse;
}
