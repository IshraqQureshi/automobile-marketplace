"use server";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getOwnerShowroom } from "@/features/showroom/my-showroom";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
  type AuthActionState,
  fieldErrorsFrom,
  requestPasswordResetSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "./schemas";

const RESET_REQUESTED_MESSAGE = "If an account exists for that email, we've sent a password reset link.";

const DUPLICATE_EMAIL_MESSAGE = "An account with this email already exists. Try logging in instead.";
const RATE_LIMITED_MESSAGE = "We're sending a lot of emails right now — please wait a few minutes and try again.";

/**
 * Reads a user's role from their own `profiles` row by id (allowed under
 * RLS — everyone can read their own profile). Wrapped in React's `cache()`
 * (keyed by userId, same pattern as getOwnerShowroom) so that within one
 * request, currentUserRole/resolveLoggedInHomePath being called from
 * multiple places (a layout AND a page it renders, for instance) collapses
 * into one query instead of one per call site.
 */
const getUserRole = cache(
  async (userId: string): Promise<"CUSTOMER" | "SHOWROOM" | "ADMIN" | null> => {
    const supabase = await createClient();
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).single();
    return profile?.role ?? null;
  },
);

/**
 * Reads the currently-authenticated user's role. Shared by signInAction
 * (rejects ADMIN) and adminSignInAction (requires ADMIN) so the
 * customer/showroom and admin login surfaces stay genuinely separate.
 * Takes a `supabase` client (not just a userId) because most callers need
 * one anyway right after an auth mutation (sign-in, etc.) where the caller
 * doesn't yet have `user.id` in hand — prefer calling getUserRole(userId)
 * directly instead when the caller already has the user, to avoid this
 * doing its own extra supabase.auth.getUser() round trip.
 */
export async function currentUserRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<"CUSTOMER" | "SHOWROOM" | "ADMIN" | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return getUserRole(user.id);
}

/**
 * ADM-003 (User Management): rejects login outright for a suspended
 * account, rather than only relying on src/lib/supabase/middleware.ts's
 * per-request check to catch it on the very next navigation. Shared by
 * signInAction and adminSignInAction — same reasoning as currentUserRole
 * above.
 */
export async function isCurrentUserActive(supabase: Awaited<ReturnType<typeof createClient>>): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return true;

  const { data: profile } = await supabase.from("profiles").select("is_active").eq("id", user.id).single();
  return profile?.is_active ?? true;
}

/**
 * Where a logged-in user belongs when there's nowhere more specific to send
 * them: an admin's own surface is /admin, a showroom owner's is /dashboard
 * (profiles.role never actually becomes "SHOWROOM" — see the note in
 * src/features/showroom/my-showroom.ts — so ownership has to be checked via
 * getOwnerShowroom, not read off role), everyone else lands on /account.
 * The single source of truth for this destination — shared by the
 * already-authenticated guards on /login and /forgot-password, by
 * signInAction's post-login redirect, and by the public header's "Profile"
 * link (getHeaderUser derives its label from this same call rather than
 * re-deriving the branching itself).
 *
 * Takes `userId` directly rather than a supabase client — every real caller
 * already has `user.id` in hand (from their own auth.getUser() call, which
 * is a genuine Supabase Auth-server round trip, not a free/local read), so
 * this doing its own redundant getUser() call would otherwise run on every
 * (site)-wrapped public page for every logged-in visitor.
 */
export async function resolveLoggedInHomePath(userId: string): Promise<string> {
  const role = await getUserRole(userId);
  if (role === "ADMIN") return "/admin";

  const showroom = await getOwnerShowroom(userId);
  return showroom ? "/dashboard" : "/account";
}

export async function signUpAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    termsAccepted: formData.get("termsAccepted"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/account`,
      data: { full_name: parsed.data.fullName, phone: `+254${parsed.data.phone}` },
    },
  });

  if (error) {
    // A brand-new signup gets this error directly. A duplicate *unconfirmed*
    // account instead gets treated as a "resend confirmation" (see the
    // over_email_send_rate_limit branch below for why that matters) and a
    // duplicate *confirmed* account is handled by the empty-identities check
    // further down — all three paths are real, verified against the actual
    // local API responses, not assumed.
    if (error.code === "user_already_exists") {
      return { status: "error", message: DUPLICATE_EMAIL_MESSAGE };
    }
    // Resending a confirmation email (the duplicate-unconfirmed-account path
    // above) counts against the same per-project email-send cap as a fresh
    // signup — so a user retrying a signup they didn't receive, or testing
    // duplicate-email handling, can hit this instead of a clean
    // already-exists response. Never leak GoTrue's raw error text for this.
    if (error.code === "over_email_send_rate_limit") {
      logger.error("Signup hit the email send rate limit", error);
      return { status: "error", message: RATE_LIMITED_MESSAGE };
    }
    return { status: "error", message: error.message };
  }

  // Defensive: some Supabase configurations (email-enumeration protection
  // with confirmations enabled) signal a duplicate via a "successful"
  // response with an empty identities array instead of a thrown error.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { status: "error", message: DUPLICATE_EMAIL_MESSAGE };
  }

  if (!data.session) {
    // Email confirmation is required (disabled in local dev via
    // supabase/config.toml auth.email.enable_confirmations — may differ in
    // staging/production, so this path must still be handled correctly).
    return {
      status: "confirmation_required",
      message: "Check your email to confirm your account before logging in.",
    };
  }

  redirect("/account");
}

export async function signInAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Deliberately generic — do not reveal whether the email exists.
    return { status: "error", message: "Invalid email or password." };
  }

  // This login is for customers and showrooms only — admin has its own
  // surface at /admin/login. Reject and sign back out rather than let an
  // admin session start here. Reusing the same generic message (not
  // "use the admin login instead") deliberately avoids confirming to
  // whoever's at the keyboard that these credentials belong to an admin
  // account — same reasoning as the "Invalid email or password" above.
  const role = await currentUserRole(supabase);
  if (role === "ADMIN") {
    // scope: "local" — sign out only the session this attempt just created,
    // not every session this admin has elsewhere. supabase-js defaults
    // signOut() to "global" scope, which would otherwise kill a legitimate
    // active admin session on another device just because someone (or the
    // admin themselves, by habit) tried these credentials on the wrong
    // login form.
    await supabase.auth.signOut({ scope: "local" });
    return { status: "error", message: "Invalid email or password." };
  }

  // Unlike the ADMIN check above, a suspended account's existence is
  // already confirmed by a correct password — a specific message here
  // reveals nothing a wrong-password attempt wouldn't already rule out, and
  // is far more useful to the real account holder than a generic failure.
  if (!(await isCurrentUserActive(supabase))) {
    await supabase.auth.signOut({ scope: "local" });
    return { status: "error", message: "This account has been suspended. Contact support for help." };
  }

  // Send a showroom owner straight to their dashboard (ADMIN never reaches
  // here — rejected above) rather than the generic account page they'd
  // otherwise have to know to navigate away from.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  redirect(user ? await resolveLoggedInHomePath(user.id) : "/account");
}

export async function signInWithGoogleAction(): Promise<void> {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });

  if (error || !data.url) {
    logger.error("Google OAuth sign-in failed to produce a redirect URL", error);
    redirect("/login?error=google_oauth_failed");
  }

  redirect(data.url);
}

export async function requestPasswordResetAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = requestPasswordResetSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  // Deliberately generic regardless of outcome — do not reveal whether the
  // email exists (email-enumeration protection, same reasoning as signIn's
  // "Invalid email or password").
  if (error) {
    logger.error("Password reset request failed", error);
  }

  return { status: "confirmation_required", message: RESET_REQUESTED_MESSAGE };
}

export async function resetPasswordAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const supabase = await createClient();

  // Requires an active recovery session, established by the code exchange
  // in /auth/callback before this page is reachable — see reset-password/page.tsx.
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return { status: "error", message: error.message };
  }

  redirect("/account");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  // scope: "local" — log out of this device only. supabase-js defaults to
  // "global" (all sessions everywhere), which isn't what a single "Log out"
  // button on one device should do.
  const { error } = await supabase.auth.signOut({ scope: "local" });

  if (error) {
    // Do not redirect to /login implying success — that would let a user
    // believe they're logged out (e.g. on a shared device) when the
    // session cookie may still be valid.
    logger.error("Sign-out failed", error);
    redirect("/account?error=sign_out_failed");
  }

  redirect("/login");
}
