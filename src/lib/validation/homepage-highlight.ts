// Kept in sync manually with the homepage-highlights bucket's own config —
// see supabase/migrations/20260906010000_create_homepage_highlights.sql.
// Same "not a zod schema, checked imperatively" reasoning as
// src/lib/validation/logo.ts.
export const ALLOWED_HIGHLIGHT_THUMBNAIL_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_HIGHLIGHT_THUMBNAIL_SIZE_BYTES = 2 * 1024 * 1024; // 2MB — matches the bucket's file_size_limit
