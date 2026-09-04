import { z } from "zod";

export const catalogNameSchema = z.string().trim().min(1, "Name is required").max(100, "Name must be under 100 characters");

// Mirrors the `brand-logos` Storage bucket config
// (supabase/migrations/20260905030001_create_brand_logos_bucket.sql) — kept
// in sync manually since bucket config isn't something the app can read at
// runtime; both sides must agree on what's accepted. File objects aren't
// validated through a zod schema in this codebase (see
// src/features/showroom/actions.ts) — these constants are checked
// imperatively wherever a logo file is handled.
export const ALLOWED_LOGO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"] as const;
export const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024; // 2MB — logos are small; matches the bucket's file_size_limit
