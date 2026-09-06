import { z } from "zod";

// ADM-003 (Customer/User Management). Only CUSTOMER/ADMIN are real,
// meaningfully-different roles in this app — "SHOWROOM" exists in the
// `user_role` enum but registering a showroom never actually assigns it
// (ownership is determined by showrooms.owner_user_id, not profiles.role —
// see src/features/auth/actions.ts's own comment on this). Offering
// "SHOWROOM" as a settable role here would imply it changes something it
// doesn't, so it's deliberately excluded from the admin-settable set.
export const ADMIN_SETTABLE_USER_ROLES = ["CUSTOMER", "ADMIN"] as const;
export const adminSettableRoleSchema = z.enum(ADMIN_SETTABLE_USER_ROLES);
