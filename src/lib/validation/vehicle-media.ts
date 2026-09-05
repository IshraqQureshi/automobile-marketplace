// Matches the vehicle-media Storage bucket's own constraints exactly (see
// supabase/migrations/20260903203105_create_storage_buckets.sql) — kept as
// a shared constant so the client-side check and the bucket's own
// server-side enforcement can never silently drift apart.
export const ALLOWED_VEHICLE_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_VEHICLE_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
