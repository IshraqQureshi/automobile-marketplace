"use server";

import { revalidatePath } from "next/cache";
import { fieldErrorsFrom } from "@/lib/validation/field-errors";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { emailSchema, passwordSchema, profileSchema } from "./schemas";

// Personal-account self-service actions — usable by any signed-in user
// regardless of role (admin, showroom owner, or a plain customer), unlike
// src/features/showroom/profile-actions.ts, which edits the *showroom's*
// business identity (a different row in a different table). Every action
// here operates only on the caller's own auth.uid() row, via the ordinary
// RLS-scoped client — profiles_update_own_or_admin already permits a user
// to update their own row, and prevent_profile_self_privilege_changes (see
// that trigger's migration) blocks role/is_active regardless, so there's no
// need to duplicate that guard here; full_name/phone are simply not
// privileged fields.

export interface AccountActionResult {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
}

export async function updateMyProfileAction(formData: FormData): Promise<AccountActionResult> {
  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, phone: `+254${parsed.data.phone}` })
    .eq("id", user.id)
    .select("id");
  if (error) {
    logger.error("Failed to update own profile", error, { userId: user.id });
    return { error: "Failed to update profile." };
  }
  if (!data || data.length === 0) return { error: "Not found, or you don't have permission to do that." };

  revalidatePath("/admin/profile");
  revalidatePath("/dashboard/account");
  revalidatePath("/account");
  return {};
}

export interface UpdateEmailResult extends AccountActionResult {
  confirmationSent?: boolean;
}

export async function updateMyEmailAction(formData: FormData): Promise<UpdateEmailResult> {
  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const supabase = await createClient();
  // supabase/config.toml's auth.email.double_confirm_changes = true means
  // this does not take effect immediately — GoTrue emails a confirmation
  // link to both the old and new address, and the change only applies once
  // both are clicked. The caller must surface that, not claim success.
  const { error } = await supabase.auth.updateUser({ email: parsed.data.email });
  if (error) {
    logger.error("Failed to request an email change", error);
    return { error: error.message };
  }

  return { confirmationSent: true };
}

export async function updateMyPasswordAction(formData: FormData): Promise<AccountActionResult> {
  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const supabase = await createClient();
  // secure_password_change = false (supabase/config.toml) — no
  // reauthentication/current-password required from an active session,
  // same as this project's signed-out reset-password flow.
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    logger.error("Failed to update own password", error);
    return { error: error.message };
  }

  return {};
}
