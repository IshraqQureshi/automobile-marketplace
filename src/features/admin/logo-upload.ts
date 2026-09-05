import { logger } from "@/lib/logger";
import type { createClient } from "@/lib/supabase/server";
import { ALLOWED_LOGO_MIME_TYPES, MAX_LOGO_SIZE_BYTES } from "@/lib/validation/logo";

// Plain module, deliberately not a "use server" file — same reasoning as
// src/features/showroom/document-upload.ts: every top-level export of a
// "use server" file becomes a directly client-invokable Server Action
// regardless of whether any UI calls it, and this is only ever called from
// within an existing action.

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type LogoTable = "brands" | "showrooms";

export function validateLogoFile(file: File): string | null {
  if (!ALLOWED_LOGO_MIME_TYPES.includes(file.type as (typeof ALLOWED_LOGO_MIME_TYPES)[number])) {
    return "Logo must be a JPG, PNG, WEBP, or SVG file.";
  }
  if (file.size > MAX_LOGO_SIZE_BYTES) {
    return "Logo must be smaller than 2MB.";
  }
  return null;
}

/**
 * Uploads a new logo file to `bucket` and records its path on `table`'s row.
 * Shared by createBrandAction/updateBrandAction and the admin showroom CRUD
 * actions — both need the exact same upload-then-record-with-orphan-cleanup
 * behavior for a small public logo image, differing only in which bucket
 * and table they target. Not rolled back on failure by the caller: a brand
 * or showroom with no (or an unchanged) logo is a perfectly valid,
 * non-stuck state the admin can freely retry from the same edit form.
 */
export async function uploadEntityLogo(
  supabase: SupabaseServerClient,
  bucket: string,
  table: LogoTable,
  id: string,
  file: File,
): Promise<{ error: { message: string } | null }> {
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const path = `${id}/logo-${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return { error: uploadError };

  const { error: updateError } = await supabase.from(table).update({ logo_storage_path: path }).eq("id", id);
  if (updateError) {
    // The file uploaded but nothing will ever reference it — clean it up
    // rather than leaving a permanent orphan (a fresh randomUUID path is
    // generated on retry either way, so this exact object can't become
    // reachable later).
    const { error: cleanupError } = await supabase.storage.from(bucket).remove([path]);
    if (cleanupError) {
      logger.warn(`Failed to clean up an orphaned ${table} logo upload`, { id, path, error: cleanupError.message });
    }
    return { error: updateError };
  }

  return { error: null };
}
