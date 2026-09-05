import { z } from "zod";

export const catalogNameSchema = z.string().trim().min(1, "Name is required").max(100, "Name must be under 100 characters");

// Moved to src/lib/validation/logo.ts now that showroom logos (admin
// showroom CRUD) need the exact same constraints — re-exported here so
// existing importers of these two names from this module aren't broken.
export { ALLOWED_LOGO_MIME_TYPES, MAX_LOGO_SIZE_BYTES } from "@/lib/validation/logo";
