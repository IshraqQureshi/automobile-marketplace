import { logger } from "@/lib/logger";
import type { createClient } from "@/lib/supabase/server";
import { ALLOWED_HIGHLIGHT_THUMBNAIL_MIME_TYPES, MAX_HIGHLIGHT_THUMBNAIL_SIZE_BYTES } from "@/lib/validation/homepage-highlight";

// Plain module, deliberately not "use server" — same reasoning as
// src/features/admin/logo-upload.ts: every top-level export of a "use
// server" file becomes a directly client-invokable Server Action (or, for
// a non-async export like validateThumbnailFile, simply fails to build —
// "use server" files may only export async functions), and validateThumbnailFile
// needs to be callable from the client form for pre-submit validation.

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export function validateThumbnailFile(file: File): string | null {
  if (!ALLOWED_HIGHLIGHT_THUMBNAIL_MIME_TYPES.includes(file.type as (typeof ALLOWED_HIGHLIGHT_THUMBNAIL_MIME_TYPES)[number])) {
    return "Thumbnail must be a JPG, PNG, or WEBP file.";
  }
  if (file.size > MAX_HIGHLIGHT_THUMBNAIL_SIZE_BYTES) {
    return "Thumbnail must be smaller than 2MB.";
  }
  return null;
}

export async function uploadHighlightThumbnail(supabase: SupabaseServerClient, file: File): Promise<{ path?: string; error?: string }> {
  const validationError = validateThumbnailFile(file);
  if (validationError) return { error: validationError };

  const extension = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const path = `${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("homepage-highlights").upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    logger.error("Failed to upload a homepage highlight thumbnail", error);
    return { error: "Failed to upload thumbnail." };
  }
  return { path };
}
