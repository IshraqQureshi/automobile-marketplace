"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { currentUserRole, isCurrentUserActive } from "@/features/auth/actions";
import { type AuthActionState, fieldErrorsFrom, signInSchema } from "@/features/auth/schemas";

const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password.";

/**
 * Admin-only sign-in — deliberately separate from signInAction (customer/
 * showroom). Even a correct email/password pair is rejected here unless the
 * account's profile role is ADMIN, and the same generic message is used for
 * both "wrong credentials" and "valid but not an admin account" so this
 * form can't be used to confirm which emails belong to admins.
 */
export async function adminSignInAction(
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
    return { status: "error", message: INVALID_CREDENTIALS_MESSAGE };
  }

  const role = await currentUserRole(supabase);
  if (role !== "ADMIN") {
    // scope: "local" — sign out only the session this attempt just created.
    // supabase-js defaults signOut() to "global" scope, which would
    // otherwise kill every session this (non-admin) account has elsewhere
    // just because someone tried it on the admin login form.
    await supabase.auth.signOut({ scope: "local" });
    return { status: "error", message: INVALID_CREDENTIALS_MESSAGE };
  }

  // Role is already confirmed ADMIN at this point, so a specific message
  // here doesn't weaken the generic-message protection above (that one
  // hides whether an account is an admin at all; this one only applies once
  // that's already established).
  if (!(await isCurrentUserActive(supabase))) {
    await supabase.auth.signOut({ scope: "local" });
    return { status: "error", message: "This account has been suspended." };
  }

  redirect("/admin");
}

export async function adminSignOutAction(): Promise<void> {
  const supabase = await createClient();
  // scope: "local" — log out of this device only, not every admin session.
  const { error } = await supabase.auth.signOut({ scope: "local" });

  if (error) {
    logger.error("Admin sign-out failed", error);
    redirect("/admin?error=sign_out_failed");
  }

  redirect("/admin/login");
}
