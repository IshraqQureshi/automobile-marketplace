import { z } from "zod";
import { emailFieldSchemas, profileFieldSchemas } from "@/features/account/schemas";

// ADM-003 (Customer/User Management). Only CUSTOMER/ADMIN are real,
// meaningfully-different roles in this app — "SHOWROOM" exists in the
// `user_role` enum but registering a showroom never actually assigns it
// (ownership is determined by showrooms.owner_user_id, not profiles.role —
// see src/features/auth/actions.ts's own comment on this). Offering
// "SHOWROOM" as a settable role here would imply it changes something it
// doesn't, so it's deliberately excluded from the admin-settable set.
export const ADMIN_SETTABLE_USER_ROLES = ["CUSTOMER", "ADMIN"] as const;
export const adminSettableRoleSchema = z.enum(ADMIN_SETTABLE_USER_ROLES);

// Reuses the exact same full name/phone/email validation the self-service
// account page already validates against (src/features/account/schemas.ts)
// rather than redefining it a third time — same reasoning as that file's
// own comment on reusing signup's field schemas.
export const userProfileFieldSchemas = {
  fullName: profileFieldSchemas.fullName,
  phone: profileFieldSchemas.phone,
  email: emailFieldSchemas.email,
};

// Used when an admin creates a brand-new account — same fields, plus the
// initial role.
export const newUserFieldSchemas = { ...userProfileFieldSchemas, role: adminSettableRoleSchema };
export const newUserSchema = z.object(newUserFieldSchemas);

// Used when an admin edits an existing account's name/phone/email. Role and
// active-status changes stay on the table's own inline controls (they're
// each a single-field action already, not part of a bigger form), so they
// aren't duplicated here.
export const editUserSchema = z.object(userProfileFieldSchemas);
