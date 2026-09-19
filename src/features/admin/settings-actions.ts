"use server";

import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { customHeadScriptsSchema, generalSettingsFieldSchemas } from "./settings-schemas";

export interface SettingsActionResult {
  error?: string;
}

const NOT_FOUND_ERROR = "Not found, or you don't have permission to do that.";

/**
 * Updates the global `whatsapp_contact_number` system_settings row — RLS
 * (system_settings_update_admin_editable_only, per the table's own
 * pre-existing policy) already restricts this to an admin and to
 * is_editable rows, so no redundant role check here, same convention as
 * every other RLS-sufficient admin action in this codebase. Stored as the
 * full "254712345678" digit string (no "+", no spaces) — exactly the form
 * WhatsApp's wa.me deep link expects — even though the input UI shows a
 * "+254" prefix chip separately (matching every other Kenyan phone field).
 *
 * Chains .select("id") and checks the result — RLS silently filters out an
 * update a non-admin caller isn't allowed to make (0 rows, no error)
 * rather than raising, so checking only `error` here would report a false
 * success for a rejected update. Same convention as every other
 * RLS-scoped update action in this codebase.
 */
export async function updateGeneralSettingsAction(formData: FormData): Promise<SettingsActionResult> {
  const parsed = generalSettingsFieldSchemas.whatsappContactNumber.safeParse(formData.get("whatsappContactNumber") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid WhatsApp number." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const value = parsed.data ? `254${parsed.data}` : "";
  const { data, error } = await supabase
    .from("system_settings")
    .update({ value, updated_by: user?.id ?? null })
    .eq("key", "whatsapp_contact_number")
    .select("id");
  if (error) {
    logger.error("Failed to update the WhatsApp contact number setting", error);
    return { error: "Failed to update this setting." };
  }
  if (!data || data.length === 0) return { error: NOT_FOUND_ERROR };

  revalidatePath("/admin/settings");
  return {};
}

/**
 * Updates the global `custom_head_scripts` system_settings row — admin-only
 * and is_editable-only via RLS (system_settings_update_admin_editable_only),
 * same convention and same 0-rows-means-rejected check as
 * updateGeneralSettingsAction above. The value is arbitrary script content
 * that runs for every public visitor, so the RLS admin gate is the security
 * boundary here — never a client-side check. Revalidates the whole site
 * layout since the snippet renders from the root layout.
 */
export async function updateHeadScriptsAction(formData: FormData): Promise<SettingsActionResult> {
  const parsed = customHeadScriptsSchema.safeParse(String(formData.get("customHeadScripts") ?? ""));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid snippet." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("system_settings")
    .update({ value: parsed.data.trim(), updated_by: user?.id ?? null })
    .eq("key", "custom_head_scripts")
    .select("id");
  if (error) {
    logger.error("Failed to update the custom head scripts setting", error);
    return { error: "Failed to update this setting." };
  }
  if (!data || data.length === 0) return { error: NOT_FOUND_ERROR };

  revalidatePath("/", "layout");
  return {};
}
