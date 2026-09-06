"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { currentUserRole } from "@/features/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminSettableRoleSchema, editUserSchema, newUserSchema } from "./user-schemas";

export interface UserActionResult {
  error?: string;
}

const NOT_ADMIN_ERROR = "You must be signed in as an admin to do that.";

// ADM-003 (User Management). Authorization is enforced entirely by RLS
// (profiles_update_own_or_admin — is_admin() OR self) plus
// prevent_profile_self_privilege_changes (a trigger, not a policy — it
// raises a real Postgres error rather than silently filtering), same
// "don't duplicate the role check in application code" reasoning as every
// other admin action in this codebase (approveShowroomAction,
// updateVehicleStatusAsAdminAction, etc). Two distinct rejection paths can
// occur here: RLS silently filters out a target the caller isn't allowed to
// touch at all (0 rows, no error — e.g. a non-admin caller), while the
// trigger raises when the target is the caller's own row (an admin cannot
// change their own role/active status, even though RLS alone would allow
// it) — both are handled below rather than only checking one.
const NOT_FOUND_ERROR = "Not found, or you don't have permission to do that.";
const SELF_CHANGE_ERROR = "You cannot change your own role or active status.";

function isSelfPrivilegeTriggerError(message: string | undefined): boolean {
  return (message ?? "").includes("cannot change your own role or active status");
}

export async function updateUserRoleAction(userId: string, role: string): Promise<UserActionResult> {
  const parsedRole = adminSettableRoleSchema.safeParse(role);
  if (!parsedRole.success) return { error: "Invalid role." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").update({ role: parsedRole.data }).eq("id", userId).select("id");
  if (error) {
    if (isSelfPrivilegeTriggerError(error.message)) return { error: SELF_CHANGE_ERROR };
    logger.error("Failed to update user role", error, { userId, role: parsedRole.data });
    return { error: "Failed to update user role." };
  }
  if (!data || data.length === 0) return { error: NOT_FOUND_ERROR };

  revalidatePath("/admin/users");
  return {};
}

/**
 * Creates a brand-new user account via Supabase's real invite flow (a
 * branded email with a link to set their own password — see
 * supabase/templates/invite.html) rather than generating and emailing a
 * plaintext password. Exactly the same pattern already used to invite a
 * brand-new showroom owner (src/features/admin/showroom-actions.ts's
 * inviteNewShowroomOwner) — this just isn't tied to also creating a
 * showroom. Requires an explicit admin check since it needs the
 * service-role client (which bypasses RLS entirely), same reasoning as
 * every service-role-backed action in that file.
 */
export async function createUserAction(formData: FormData): Promise<UserActionResult> {
  const parsed = newUserSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid user details." };

  const supabase = await createClient();
  if ((await currentUserRole(supabase)) !== "ADMIN") return { error: NOT_ADMIN_ERROR };

  const origin = (await headers()).get("origin");
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    data: {
      full_name: parsed.data.fullName,
      ...(parsed.data.phone ? { phone: `+254${parsed.data.phone}` } : {}),
    },
    // Not /auth/callback — see src/app/auth/invite-callback/page.tsx's
    // header comment for why an admin-triggered invite can't use the same
    // PKCE `?code=` handling every other auth email link in this app uses.
    redirectTo: `${origin}/auth/invite-callback`,
  });
  if (error || !data.user) {
    logger.error("Failed to invite a new user", error);
    return {
      error: error?.code === "email_exists" ? "A user with this email already exists." : "Failed to create the user. Please try again.",
    };
  }

  // handle_new_user (security definer) creates the profile row as CUSTOMER
  // regardless — promote afterward via the service-role client if ADMIN was
  // requested. A failure here doesn't roll back the account itself (the
  // invite already went out); it's logged and surfaced so the admin can
  // retry the role change from the list instead.
  if (parsed.data.role === "ADMIN") {
    const { error: roleError } = await admin.from("profiles").update({ role: "ADMIN" }).eq("id", data.user.id);
    if (roleError) {
      logger.error("Invited user created, but failed to promote to ADMIN", roleError, { userId: data.user.id });
      revalidatePath("/admin/users");
      return { error: "User invited, but failed to set their role to admin. You can change it from the list." };
    }
  }

  revalidatePath("/admin/users");
  return {};
}

/**
 * Edits an existing account's name/phone (via the normal RLS-scoped
 * client — profiles_update_own_or_admin already covers "is admin") and
 * email (via the service-role client, since email lives on auth.users, not
 * profiles — an admin-forced instant change, unlike the self-service
 * double-confirmation flow in src/features/account/actions.ts, which isn't
 * appropriate for an admin correcting someone else's account). The two
 * updates aren't atomic (different systems — Postgres vs. GoTrue), so a
 * failure on the second step is reported as a partial success rather than
 * a blanket failure, matching this project's existing tolerance for
 * best-effort two-step actions (e.g. vehicle photo upload).
 *
 * The admin-role check runs FIRST, before any write — this action is meant
 * to be reachable only from the admin-only /admin/users page, but a direct
 * call bypassing that page would otherwise let a plain user successfully
 * update their OWN name/phone (profiles_update_own_or_admin's RLS already
 * permits self-update) before hitting a "not admin" error on the email
 * step — a real partial-success bug caught live: the name/phone write
 * silently went through while the caller was told the whole action failed.
 * Checking admin role up front (matching createUserAction/deleteUserAction's
 * own ordering) avoids that entirely, rather than only reporting it better.
 */
export async function updateUserProfileAction(userId: string, formData: FormData): Promise<UserActionResult> {
  const parsed = editUserSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid user details." };

  const supabase = await createClient();
  if ((await currentUserRole(supabase)) !== "ADMIN") return { error: NOT_ADMIN_ERROR };

  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, phone: parsed.data.phone ? `+254${parsed.data.phone}` : null })
    .eq("id", userId)
    .select("id");
  if (error) {
    logger.error("Failed to update user profile", error, { userId });
    return { error: "Failed to update this user." };
  }
  if (!data || data.length === 0) return { error: NOT_FOUND_ERROR };

  const admin = createAdminClient();
  const { error: emailError } = await admin.auth.admin.updateUserById(userId, { email: parsed.data.email });
  if (emailError) {
    logger.error("User's name/phone updated, but email update failed", emailError, { userId });
    revalidatePath("/admin/users");
    return {
      error: emailError.code === "email_exists" ? "Name and phone updated, but that email is already in use by another account." : "Name and phone updated, but the email change failed.",
    };
  }

  revalidatePath("/admin/users");
  return {};
}

/**
 * Permanently deletes an account (auth.users row, cascading to profiles —
 * see 20260903201303_create_profiles.sql's `on delete cascade`). A user who
 * still owns a showroom cannot be deleted — showrooms.owner_user_id
 * references profiles(id) `on delete restrict` — GoTrue surfaces this as an
 * opaque 500 rather than a specific error code, so the message below names
 * the likely cause without asserting it with certainty. Deleting oneself is
 * blocked explicitly here: unlike role/is_active, there's no existing
 * database trigger guarding DELETE.
 */
export async function deleteUserAction(userId: string): Promise<UserActionResult> {
  const supabase = await createClient();
  const {
    data: { user: caller },
  } = await supabase.auth.getUser();
  if (!caller) return { error: "You must be signed in." };
  if (caller.id === userId) return { error: "You cannot delete your own account." };
  if ((await currentUserRole(supabase)) !== "ADMIN") return { error: NOT_ADMIN_ERROR };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    logger.error("Failed to delete user", error, { userId });
    return { error: "Failed to delete this user — they may still own a showroom or have other linked records that must be removed first." };
  }

  revalidatePath("/admin/users");
  return {};
}

export async function setUserActiveAction(userId: string, isActive: boolean): Promise<UserActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").update({ is_active: isActive }).eq("id", userId).select("id");
  if (error) {
    if (isSelfPrivilegeTriggerError(error.message)) return { error: SELF_CHANGE_ERROR };
    logger.error("Failed to update user active status", error, { userId, isActive });
    return { error: "Failed to update user status." };
  }
  if (!data || data.length === 0) return { error: NOT_FOUND_ERROR };

  revalidatePath("/admin/users");
  return {};
}
