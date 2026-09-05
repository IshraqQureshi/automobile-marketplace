"use server";

import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export interface ShowroomActionResult {
  error?: string;
}

// Admin-only: showrooms.status/verified changes are blocked for anyone but
// an admin by the prevent_showroom_self_approval trigger (see
// supabase/migrations/20260903203102_create_showroom_approval_guard.sql),
// and this page is already behind the ADMIN-only /admin/(protected) layout
// guard — same "don't duplicate the role check, just fail gracefully if
// the DB ever rejects it" reasoning as src/features/admin/catalog-actions.ts.
//
// update()'s USING clause silently filters out rows the caller isn't
// allowed to touch (0 rows affected, no error) rather than raising — every
// update below chains .select("id") and checks the result so that case is
// reported as a failure instead of a false "success".
const NOT_FOUND_ERROR = "Not found, or you don't have permission to do that.";

export async function approveShowroomAction(id: string): Promise<ShowroomActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("showrooms").update({ status: "APPROVED", verified: true }).eq("id", id).select("id");
  if (error) {
    logger.error("Failed to approve showroom", error, { id });
    return { error: "Failed to approve showroom." };
  }
  if (!data || data.length === 0) return { error: NOT_FOUND_ERROR };

  revalidatePath("/admin/showrooms");
  revalidatePath("/admin");
  return {};
}

export async function rejectShowroomAction(id: string): Promise<ShowroomActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("showrooms").update({ status: "REJECTED" }).eq("id", id).select("id");
  if (error) {
    logger.error("Failed to reject showroom", error, { id });
    return { error: "Failed to reject showroom." };
  }
  if (!data || data.length === 0) return { error: NOT_FOUND_ERROR };

  revalidatePath("/admin/showrooms");
  revalidatePath("/admin");
  return {};
}

export interface ShowroomDocumentUrlResult {
  url?: string;
  error?: string;
}

// A signed URL is generated on demand (not pre-fetched for every document
// up front) — it's short-lived and there's no reason to mint one for a
// document the admin never opens.
const SIGNED_URL_EXPIRY_SECONDS = 60;

export async function getShowroomDocumentUrlAction(storagePath: string): Promise<ShowroomDocumentUrlResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("showroom-documents").createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);
  if (error || !data) {
    logger.error("Failed to create a signed URL for a showroom document", error, { storagePath });
    return { error: "Failed to open document." };
  }
  return { url: data.signedUrl };
}
