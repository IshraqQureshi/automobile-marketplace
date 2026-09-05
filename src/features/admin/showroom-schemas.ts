import { z } from "zod";
import { registerShowroomFieldSchemas } from "@/features/showroom/schemas";

// Reuses the same business-name/location/phone/email validation the
// self-registration form uses (src/features/showroom/schemas.ts) rather
// than duplicating it — `location` maps to `showrooms.city`, same as
// there. `address`/`description` aren't collected at registration time, so
// there's no existing schema for them to reuse.
export const showroomFieldSchemas = {
  businessName: registerShowroomFieldSchemas.businessName,
  location: registerShowroomFieldSchemas.location,
  businessPhone: registerShowroomFieldSchemas.businessPhone,
  businessEmail: registerShowroomFieldSchemas.businessEmail,
  address: z
    .string()
    .trim()
    .max(200, "Address must be under 200 characters")
    .optional()
    .transform((value) => value || undefined),
  description: z
    .string()
    .trim()
    .max(1000, "Description must be under 1000 characters")
    .optional()
    .transform((value) => value || undefined),
};

export const adminShowroomSchema = z.object(showroomFieldSchemas);
export type AdminShowroomInput = z.infer<typeof adminShowroomSchema>;

export const ownerUserIdSchema = z.string().uuid("Choose an owner for this showroom.");
