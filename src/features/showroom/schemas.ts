import { z } from "zod";
import { kenyaLocalPhoneSchema } from "@/lib/validation/kenya-phone";

// Mirrors the `showroom-documents` Storage bucket config
// (supabase/migrations/20260903203105_create_storage_buckets.sql) — kept in
// sync manually since bucket config isn't something the app can read at
// runtime; both sides must agree on what's accepted.
export const ALLOWED_DOCUMENT_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;
export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB, matches the bucket's file_size_limit
export const MAX_DOCUMENTS_PER_SUBMISSION = 5;

// The only document category collected today, by both self-registration
// and the admin-created showroom flow (src/features/admin/showroom-actions.ts).
export const BUSINESS_REGISTRATION_DOCUMENT_TYPE = "business_registration";

// Base object (not yet refined) so `.shape` stays available for per-field
// client-side validation, same reasoning as auth/schemas.ts.
const registerShowroomBaseSchema = z.object({
  businessName: z.string().trim().min(2, "Business name is required").max(150, "Business name is too long"),
  // Design shows a single "Location" field (e.g. "Westlands, Nairobi") —
  // stored as `showrooms.city`; a dedicated street-address field can be
  // added later via showroom profile editing.
  location: z.string().trim().min(2, "Location is required").max(150, "Location is too long"),
  businessPhone: kenyaLocalPhoneSchema,
  businessEmail: z.string().trim().min(1, "Business email is required").email("Enter a valid email address"),
});

export const registerShowroomFieldSchemas = registerShowroomBaseSchema.shape;
export const registerShowroomSchema = registerShowroomBaseSchema;

export type RegisterShowroomInput = z.infer<typeof registerShowroomSchema>;

export interface RegisterShowroomActionState {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Partial<Record<string, string>>;
}

export const initialRegisterShowroomState: RegisterShowroomActionState = { status: "idle" };
