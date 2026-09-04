"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
  type AuthActionState,
  requestPasswordResetSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "./schemas";

const RESET_REQUESTED_MESSAGE = "If an account exists for that email, we've sent a password reset link.";

const DUPLICATE_EMAIL_MESSAGE = "An account with this email already exists. Try logging in instead.";
const RATE_LIMITED_MESSAGE = "We're sending a lot of emails right now — please wait a few minutes and try again.";

function fieldErrorsFrom(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const fieldErrors: Partial<Record<string, string>> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0]);
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
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

  redirect("/account");
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
  const { error } = await supabase.auth.signOut();

  if (error) {
    // Do not redirect to /login implying success — that would let a user
    // believe they're logged out (e.g. on a shared device) when the
    // session cookie may still be valid.
    logger.error("Sign-out failed", error);
    redirect("/account?error=sign_out_failed");
  }

  redirect("/login");
}
