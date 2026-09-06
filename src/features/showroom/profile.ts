import { logger } from "@/lib/logger";
import type { createClient } from "@/lib/supabase/server";
import { uploadEntityLogo } from "@/features/admin/logo-upload";
import type { AdminShowroomInput } from "@/features/admin/showroom-schemas";

// Plain module, not "use server" — shared by the admin showroom-edit action
// (src/features/admin/showroom-actions.ts) and the new owner self-service
// action (src/features/showroom/profile-actions.ts), which differ only in
// how they resolve *which* showroom id to write to (admin: from the form;
// owner: from getOwnerShowroom(), never trusted from client input) — the
// actual update-and-logo logic is identical, so it lives here once instead
// of being duplicated per caller.

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface ShowroomProfileFormFields {
  businessName: FormDataEntryValue | null;
  location: FormDataEntryValue | null;
  businessPhone: FormDataEntryValue | null;
  businessEmail: FormDataEntryValue | null;
  address: FormDataEntryValue | null;
  description: FormDataEntryValue | null;
  openingHours: FormDataEntryValue | null;
  youtubeChannelUrl: FormDataEntryValue | null;
}

export function readShowroomProfileFormFields(formData: FormData): ShowroomProfileFormFields {
  return {
    businessName: formData.get("businessName"),
    location: formData.get("location"),
    businessPhone: formData.get("businessPhone"),
    businessEmail: formData.get("businessEmail"),
    address: formData.get("address"),
    description: formData.get("description"),
    openingHours: formData.get("openingHours"),
    youtubeChannelUrl: formData.get("youtubeChannelUrl"),
  };
}

export interface ShowroomProfileUpdateResult {
  error?: string;
  warning?: string;
}

/**
 * Updates a showroom's editable profile fields (business name, location,
 * phone, email, address, description, logo) — never status/verified,
 * which the prevent_showroom_self_approval trigger blocks for anyone but
 * an admin anyway, and which this function never touches. Caller is
 * responsible for validating `parsed` and resolving/authorizing
 * `showroomId` — this just performs the write.
 */
export async function updateShowroomProfile(
  supabase: SupabaseServerClient,
  showroomId: string,
  parsed: AdminShowroomInput,
  logoFile: File | null,
  removeLogo: boolean,
): Promise<ShowroomProfileUpdateResult> {
  let previousLogoPath: string | null = null;
  if (logoFile || removeLogo) {
    const { data: existing } = await supabase.from("showrooms").select("logo_storage_path").eq("id", showroomId).maybeSingle();
    previousLogoPath = existing?.logo_storage_path ?? null;
  }

  const { data, error } = await supabase
    .from("showrooms")
    .update({
      business_name: parsed.businessName,
      city: parsed.location,
      phone: `+254${parsed.businessPhone}`,
      email: parsed.businessEmail,
      address: parsed.address ?? null,
      description: parsed.description ?? null,
      opening_hours: parsed.openingHours ?? null,
      youtube_channel_url: parsed.youtubeChannelUrl ?? null,
      ...(removeLogo && !logoFile ? { logo_storage_path: null } : {}),
    })
    .eq("id", showroomId)
    .select("id");
  if (error) {
    logger.error("Failed to update showroom profile", error, { showroomId });
    return { error: "Failed to update showroom." };
  }
  if (!data || data.length === 0) return { error: "Not found, or you don't have permission to do that." };

  if (logoFile) {
    const { error: logoError } = await uploadEntityLogo(supabase, "showroom-logos", "showrooms", showroomId, logoFile);
    if (logoError) {
      logger.error("Failed to upload showroom logo", logoError, { showroomId });
      return { warning: "Details updated, but the new logo failed to upload. Try again." };
    }
  }

  if ((logoFile || removeLogo) && previousLogoPath) {
    const { error: removeError } = await supabase.storage.from("showroom-logos").remove([previousLogoPath]);
    if (removeError) {
      logger.warn("Failed to remove a showroom's previous logo file", { showroomId, previousLogoPath, error: removeError.message });
    }
  }

  return {};
}
