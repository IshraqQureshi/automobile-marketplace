"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * GoTrue's admin.inviteUserByEmail() link is fundamentally different from
 * every other auth email link in this app: those are user-initiated
 * (forgot-password, email confirmation) through the PKCE-enabled
 * @supabase/ssr browser/server clients, so GoTrue redirects to
 * /auth/callback with a `?code=` query param it can exchange server-side.
 * An admin-triggered invite has no originating browser request to attach a
 * PKCE code challenge to, so GoTrue can only return the session as
 * implicit-flow tokens in the URL's hash fragment (#access_token=...) —
 * which never reaches the server at all (confirmed live: the classic
 * /auth/v1/verify?type=invite link redirects with tokens after a `#`, not
 * a `?code=`, so /auth/callback's exchangeCodeForSession finds nothing and
 * fails). This page reads that fragment client-side and establishes the
 * session via setSession(), which the @supabase/ssr browser client then
 * syncs into cookies for the server-side client to see on the next request.
 */
export default function InviteCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) {
      router.replace("/login?error=auth_callback_failed");
      return;
    }

    const supabase = createClient();
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => {
      router.replace(error ? "/login?error=auth_callback_failed" : "/reset-password");
    });
  }, [router]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6">
      <p className="text-sm text-neutral-500">Setting up your account…</p>
    </main>
  );
}
