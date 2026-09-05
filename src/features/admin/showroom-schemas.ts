import { z } from "zod";
import { registerShowroomFieldSchemas } from "@/features/showroom/schemas";
import { kenyaLocalPhoneOptionalSchema } from "@/lib/validation/kenya-phone";

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

// Fields for inviting a brand-new user to own the showroom being created,
// as an alternative to picking an existing one via ownerUserIdSchema.
export const newOwnerFieldSchemas = {
  ownerFullName: z.string().trim().min(2, "Owner full name is required").max(150, "Owner full name is too long"),
  ownerEmail: z.string().trim().min(1, "Owner email is required").email("Enter a valid email address"),
  ownerPhone: kenyaLocalPhoneOptionalSchema,
};

export const newOwnerSchema = z.object(newOwnerFieldSchemas);
