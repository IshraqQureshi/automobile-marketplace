"use server";

import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { uploadHighlightThumbnail } from "./homepage-highlight-upload";
import { highlightFieldSchemas, socialLinkFieldSchemas } from "./homepage-highlights-schemas";

export interface HighlightActionResult {
  error?: string;
}

// Authorization for every action below is enforced entirely by RLS
// (homepage_highlights_insert/update/delete_admin_only, is_admin()) — this
// page already lives behind the ADMIN-only /admin/(protected) layout guard,
// same "don't duplicate the role check, just fail gracefully if the DB ever
// rejects it" reasoning as src/features/admin/catalog-actions.ts. Every
// mutation below chains .select("id") and checks the result, since RLS
// silently filters out disallowed rows (0 rows, no error) rather than
// erroring.
const NOT_FOUND_ERROR = "Not found, or you don't have permission to do that.";

export async function createHighlightAction(formData: FormData): Promise<HighlightActionResult> {
  const parsed = highlightFieldSchemas.title.safeParse(formData.get("title"));
  const platformParsed = highlightFieldSchemas.platform.safeParse(formData.get("platform"));
  const urlParsed = highlightFieldSchemas.videoUrl.safeParse(formData.get("videoUrl"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid title." };
  if (!platformParsed.success) return { error: platformParsed.error.issues[0]?.message ?? "Invalid platform." };
  if (!urlParsed.success) return { error: urlParsed.error.issues[0]?.message ?? "Invalid video URL." };

  const thumbnailEntry = formData.get("thumbnail");
  const thumbnailFile = thumbnailEntry instanceof File && thumbnailEntry.size > 0 ? thumbnailEntry : null;
  if (!thumbnailFile) return { error: "A thumbnail image is required." };

  const sortOrderRaw = formData.get("sortOrder");
  const sortOrder = typeof sortOrderRaw === "string" && sortOrderRaw ? Number(sortOrderRaw) : 0;
  const isActive = formData.get("isActive") === "true";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const upload = await uploadHighlightThumbnail(supabase, thumbnailFile);
  if (upload.error || !upload.path) return { error: upload.error ?? "Failed to upload thumbnail." };

  const { error } = await supabase.from("homepage_highlights").insert({
    title: parsed.data,
    platform: platformParsed.data,
    video_url: urlParsed.data,
    thumbnail_storage_path: upload.path,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    is_active: isActive,
    created_by: user?.id ?? null,
  });
  if (error) {
    logger.error("Failed to create a homepage highlight", error);
    await supabase.storage.from("homepage-highlights").remove([upload.path]);
    return { error: "Failed to create highlight." };
  }

  revalidatePath("/admin/highlights");
  revalidatePath("/");
  return {};
}

export async function updateHighlightAction(formData: FormData): Promise<HighlightActionResult> {
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Missing highlight id." };

  const parsed = highlightFieldSchemas.title.safeParse(formData.get("title"));
  const platformParsed = highlightFieldSchemas.platform.safeParse(formData.get("platform"));
  const urlParsed = highlightFieldSchemas.videoUrl.safeParse(formData.get("videoUrl"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid title." };
  if (!platformParsed.success) return { error: platformParsed.error.issues[0]?.message ?? "Invalid platform." };
  if (!urlParsed.success) return { error: urlParsed.error.issues[0]?.message ?? "Invalid video URL." };

  const sortOrderRaw = formData.get("sortOrder");
  const sortOrder = typeof sortOrderRaw === "string" && sortOrderRaw ? Number(sortOrderRaw) : 0;
  const isActive = formData.get("isActive") === "true";

  const supabase = await createClient();

  const thumbnailEntry = formData.get("thumbnail");
  const thumbnailFile = thumbnailEntry instanceof File && thumbnailEntry.size > 0 ? thumbnailEntry : null;

  let newThumbnailPath: string | null = null;
  let previousThumbnailPath: string | null = null;
  if (thumbnailFile) {
    const { data: existing } = await supabase.from("homepage_highlights").select("thumbnail_storage_path").eq("id", id).maybeSingle();
    previousThumbnailPath = existing?.thumbnail_storage_path ?? null;

    const upload = await uploadHighlightThumbnail(supabase, thumbnailFile);
    if (upload.error || !upload.path) return { error: upload.error ?? "Failed to upload thumbnail." };
    newThumbnailPath = upload.path;
  }

  const { data, error } = await supabase
    .from("homepage_highlights")
    .update({
      title: parsed.data,
      platform: platformParsed.data,
      video_url: urlParsed.data,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      is_active: isActive,
      ...(newThumbnailPath ? { thumbnail_storage_path: newThumbnailPath } : {}),
    })
    .eq("id", id)
    .select("id");
  if (error) {
    logger.error("Failed to update a homepage highlight", error, { id });
    if (newThumbnailPath) await supabase.storage.from("homepage-highlights").remove([newThumbnailPath]);
    return { error: "Failed to update highlight." };
  }
  if (!data || data.length === 0) {
    if (newThumbnailPath) await supabase.storage.from("homepage-highlights").remove([newThumbnailPath]);
    return { error: NOT_FOUND_ERROR };
  }

  if (newThumbnailPath && previousThumbnailPath) {
    const { error: removeError } = await supabase.storage.from("homepage-highlights").remove([previousThumbnailPath]);
    if (removeError) {
      logger.warn("Failed to remove a highlight's previous thumbnail file", { id, previousThumbnailPath, error: removeError.message });
    }
  }

  revalidatePath("/admin/highlights");
  revalidatePath("/");
  return {};
}

export async function deleteHighlightAction(id: string): Promise<HighlightActionResult> {
  const supabase = await createClient();

  const { data: existing } = await supabase.from("homepage_highlights").select("thumbnail_storage_path").eq("id", id).maybeSingle();

  const { data, error } = await supabase.from("homepage_highlights").delete().eq("id", id).select("id");
  if (error) {
    logger.error("Failed to delete a homepage highlight", error, { id });
    return { error: "Failed to delete highlight." };
  }
  if (!data || data.length === 0) return { error: NOT_FOUND_ERROR };

  if (existing?.thumbnail_storage_path) {
    const { error: removeError } = await supabase.storage.from("homepage-highlights").remove([existing.thumbnail_storage_path]);
    if (removeError) {
      logger.warn("Failed to remove a deleted highlight's thumbnail file", { id, path: existing.thumbnail_storage_path, error: removeError.message });
    }
  }

  revalidatePath("/admin/highlights");
  revalidatePath("/");
  return {};
}

export interface UpdateSocialLinksResult {
  error?: string;
}

// Two scalar homepage settings stored in the existing system_settings
// catalog (category 'homepage') rather than a dedicated table — see that
// migration's own comment.
export async function updateSocialLinksAction(formData: FormData): Promise<UpdateSocialLinksResult> {
  const parsed = {
    tiktokProfileUrl: socialLinkFieldSchemas.tiktokProfileUrl.safeParse(formData.get("tiktokProfileUrl")),
    youtubeChannelUrl: socialLinkFieldSchemas.youtubeChannelUrl.safeParse(formData.get("youtubeChannelUrl")),
  };
  if (!parsed.tiktokProfileUrl.success) return { error: parsed.tiktokProfileUrl.error.issues[0]?.message ?? "Invalid TikTok URL." };
  if (!parsed.youtubeChannelUrl.success) return { error: parsed.youtubeChannelUrl.error.issues[0]?.message ?? "Invalid YouTube URL." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // `value` is jsonb — supabase-js/PostgREST serializes whatever JS value is
  // passed here into the request body's JSON directly, so a plain string
  // becomes a valid jsonb string on its own; manually JSON.stringify-ing it
  // first would double-encode it (a jsonb string containing literal escaped
  // quotes), same convention the seed migration's raw SQL literals show
  // ('"HarakaGari"' as *SQL text*, not something app code re-produces).
  const updates = [
    { key: "homepage_tiktok_profile_url", value: parsed.tiktokProfileUrl.data },
    { key: "homepage_youtube_channel_url", value: parsed.youtubeChannelUrl.data },
  ];

  for (const { key, value } of updates) {
    const { error } = await supabase
      .from("system_settings")
      .update({ value, updated_by: user?.id ?? null })
      .eq("key", key);
    if (error) {
      logger.error("Failed to update a homepage system setting", error, { key });
      return { error: "Failed to update social links." };
    }
  }

  revalidatePath("/admin/highlights");
  revalidatePath("/");
  return {};
}
