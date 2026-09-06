"use server";

import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { adminSettableRoleSchema } from "./user-schemas";

export interface UserActionResult {
  error?: string;
}

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
