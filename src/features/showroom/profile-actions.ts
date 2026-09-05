"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateLogoFile } from "@/features/admin/logo-upload";
import { adminShowroomSchema } from "@/features/admin/showroom-schemas";
import { getOwnerShowroom } from "@/features/showroom/my-showroom";
import { readShowroomProfileFormFields, updateShowroomProfile, type ShowroomProfileUpdateResult } from "./profile";

// Reuses adminShowroomSchema/showroomFieldSchemas from the admin feature
// (src/features/admin/showroom-schemas.ts) rather than duplicating the same
// business-name/location/phone/email/address/description validation a
// third time — that module already reuses registerShowroomFieldSchemas
// from this same feature folder for the shared fields, so this is just the
// same reuse relationship in the other direction.
//
// Unlike admin's updateShowroomAction, this action never accepts a
// showroom id from the client — it always resolves the caller's own
// showroom server-side via getOwnerShowroom(), so there's no id parameter
// to spoof in the first place (RLS's owner-or-admin policy would also
// reject a mismatched id, but this doesn't rely on that alone).
export async function updateMyShowroomProfileAction(formData: FormData): Promise<ShowroomProfileUpdateResult> {
  const parsed = adminShowroomSchema.safeParse(readShowroomProfileFormFields(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid showroom details." };

  const logoEntry = formData.get("logo");
  const logoFile = logoEntry instanceof File && logoEntry.size > 0 ? logoEntry : null;
  const removeLogo = formData.get("removeLogo") === "true";
  if (logoFile) {
    const logoError = validateLogoFile(logoFile);
    if (logoError) return { error: logoError };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const showroom = await getOwnerShowroom(user.id);
  if (!showroom) return { error: "No showroom found for your account." };

  const result = await updateShowroomProfile(supabase, showroom.id, parsed.data, logoFile, removeLogo);

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");
  return result;
}
