import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Shared callback for both OAuth (Google) and email-confirmation links —
 * both use Supabase's PKCE code-exchange flow, landing here with a `code`
 * query param.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/account";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
