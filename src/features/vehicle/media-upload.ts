import { logger } from "@/lib/logger";
import type { createClient } from "@/lib/supabase/server";
import { ALLOWED_VEHICLE_IMAGE_MIME_TYPES, MAX_VEHICLE_IMAGE_SIZE_BYTES } from "@/lib/validation/vehicle-media";

// Plain module, deliberately not a "use server" file — same reasoning as
// src/features/showroom/document-upload.ts and
// src/features/admin/logo-upload.ts: every top-level export of a
// "use server" file becomes a directly client-invokable Server Action
// regardless of whether any UI calls it, and this is only ever called from
// within an existing action in src/features/vehicle/actions.ts.

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export function validateVehicleImageFile(file: File): string | null {
  if (!ALLOWED_VEHICLE_IMAGE_MIME_TYPES.includes(file.type as (typeof ALLOWED_VEHICLE_IMAGE_MIME_TYPES)[number])) {
    return "Photos must be a JPG, PNG, or WEBP file.";
  }
  if (file.size > MAX_VEHICLE_IMAGE_SIZE_BYTES) {
    return "Each photo must be smaller than 10MB.";
  }
  return null;
}

/**
 * Uploads each file to the vehicle-media bucket
 * (`vehicle-media/{showroomId}/{vehicleId}/{file}` — the storage RLS
 * policies key off segment 1 being the showroom id, see
 * supabase/migrations/20260903203106_create_storage_policies.sql) and
 * records a vehicle_media row for it, in ascending sort order continuing
 * from `startingSortOrder`. If the vehicle currently has no media at all,
 * the first uploaded file becomes the primary image.
 */
export async function uploadVehicleMedia(
  supabase: SupabaseServerClient,
  showroomId: string,
  vehicleId: string,
  files: File[],
  startingSortOrder: number,
): Promise<{ failedUploads: string[] }> {
  const failedUploads: string[] = [];
  let sortOrder = startingSortOrder;

  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
    const storagePath = `${showroomId}/${vehicleId}/${crypto.randomUUID()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("vehicle-media")
      .upload(storagePath, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      logger.error("Failed to upload vehicle photo", uploadError, { vehicleId, fileName: file.name });
      failedUploads.push(file.name);
      continue;
    }

    const { error: mediaError } = await supabase.from("vehicle_media").insert({
      vehicle_id: vehicleId,
      storage_path: storagePath,
      sort_order: sortOrder,
      is_primary: sortOrder === 0,
    });
    if (mediaError) {
      logger.error("Failed to record uploaded vehicle photo", mediaError, { vehicleId, fileName: file.name });
      failedUploads.push(file.name);
      const { error: cleanupError } = await supabase.storage.from("vehicle-media").remove([storagePath]);
      if (cleanupError) {
        logger.warn("Failed to clean up an orphaned vehicle photo upload", { vehicleId, storagePath, error: cleanupError.message });
      }
      continue;
    }
    sortOrder++;
  }

  return { failedUploads };
}
