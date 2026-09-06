"use server";

import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { showroomVideoFieldSchemas } from "./video-schemas";

export interface VideoActionResult {
  error?: string;
}

// Authorization is enforced entirely by RLS (showroom_videos_insert/update/
// delete_owner_or_admin, owns_showroom()) — the caller-supplied showroomId
// is never trusted on its own, same convention as vehicle/actions.ts's
// uploadVehiclePhotosAction(vehicleId, ...). RLS silently filters out a
// disallowed delete (0 rows, no error) rather than raising, so it's
// re-checked below — same convention as every other mutation in this app.
const NOT_FOUND_ERROR = "Not found, or you don't have permission to do that.";

export async function createShowroomVideoAction(showroomId: string, formData: FormData): Promise<VideoActionResult> {
  const titleParsed = showroomVideoFieldSchemas.title.safeParse(formData.get("title"));
  if (!titleParsed.success) return { error: titleParsed.error.issues[0]?.message ?? "Invalid title." };
  const urlParsed = showroomVideoFieldSchemas.videoUrl.safeParse(formData.get("videoUrl"));
  if (!urlParsed.success) return { error: urlParsed.error.issues[0]?.message ?? "Invalid video URL." };

  const supabase = await createClient();

  // RLS-scoped existence check: confirms the showroom exists at all before
  // inserting a child row against it (the insert's own RLS with-check would
  // reject an unowned showroom either way, but this gives a clean NOT_FOUND
  // for a bogus/gone id specifically, rather than a raw insert failure).
  const { data: showroom } = await supabase.from("showrooms").select("id").eq("id", showroomId).maybeSingle();
  if (!showroom) return { error: NOT_FOUND_ERROR };

  const { count } = await supabase.from("showroom_videos").select("id", { count: "exact", head: true }).eq("showroom_id", showroomId);

  const { error } = await supabase.from("showroom_videos").insert({
    showroom_id: showroomId,
    title: titleParsed.data,
    video_url: urlParsed.data,
    sort_order: count ?? 0,
  });
  if (error) {
    logger.error("Failed to add a showroom video", error, { showroomId });
    return { error: "Failed to add video." };
  }

  revalidatePath("/dashboard/profile");
  return {};
}

export async function deleteShowroomVideoAction(videoId: string): Promise<VideoActionResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.from("showroom_videos").delete().eq("id", videoId).select("id");
  if (error) {
    logger.error("Failed to delete a showroom video", error, { videoId });
    return { error: "Failed to delete video." };
  }
  if (!data || data.length === 0) return { error: NOT_FOUND_ERROR };

  revalidatePath("/dashboard/profile");
  return {};
}
