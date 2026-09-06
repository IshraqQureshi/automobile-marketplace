"use server";

import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { generalSettingsFieldSchemas } from "./settings-schemas";

export interface SettingsActionResult {
  error?: string;
}

/**
 * Updates the global `whatsapp_contact_number` system_settings row — RLS
 * (system_settings_update_admin_editable_only, per the table's own
 * pre-existing policy) already restricts this to an admin and to
 * is_editable rows, so
 * no redundant role check here, same convention as every other
 * RLS-sufficient admin action in this codebase. Stored as the full
 * "254712345678" digit string (no "+", no spaces) — exactly the form
 * WhatsApp's wa.me deep link expects — even though the input UI shows a
 * "+254" prefix chip separately (matching every other Kenyan phone field).
 */
export async function updateGeneralSettingsAction(formData: FormData): Promise<SettingsActionResult> {
  const parsed = generalSettingsFieldSchemas.whatsappContactNumber.safeParse(formData.get("whatsappContactNumber") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid WhatsApp number." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const value = parsed.data ? `254${parsed.data}` : "";
  const { error } = await supabase
    .from("system_settings")
    .update({ value, updated_by: user?.id ?? null })
    .eq("key", "whatsapp_contact_number");
  if (error) {
    logger.error("Failed to update the WhatsApp contact number setting", error);
    return { error: "Failed to update this setting." };
  }

  revalidatePath("/admin/settings");
  return {};
}
