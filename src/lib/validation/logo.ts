// Shared by every "upload a small logo image to a public Storage bucket"
// feature (brand logos, showroom logos) — same accepted types/size for
// both, kept in sync manually with each bucket's own config since bucket
// config isn't something the app can read at runtime (see
// supabase/migrations/20260905030001_create_brand_logos_bucket.sql and
// 20260905060001_create_showroom_logos_bucket.sql). File objects aren't
// validated through a zod schema in this codebase — these constants are
// checked imperatively wherever a logo file is handled.
export const ALLOWED_LOGO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"] as const;
export const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024; // 2MB — logos are small; matches each bucket's file_size_limit
