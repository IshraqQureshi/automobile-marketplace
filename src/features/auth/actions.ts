"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type AuthActionState, signInSchema, signUpSchema } from "./schemas";

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
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.fullName } },
  });

  const DUPLICATE_EMAIL_MESSAGE = "An account with this email already exists. Try logging in instead.";

  if (error) {
    // With email confirmations disabled (as in local dev — see
    // supabase/config.toml auth.email.enable_confirmations), Supabase has
    // nothing to hide and returns an explicit user_already_exists error
    // directly, rather than the ambiguous "success" response its
    // email-enumeration protection uses when confirmations are required.
    // Verified against the actual local API response, not assumed.
    if (error.code === "user_already_exists") {
      return { status: "error", message: DUPLICATE_EMAIL_MESSAGE };
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
    redirect("/login?error=google_oauth_failed");
  }

  redirect(data.url);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
