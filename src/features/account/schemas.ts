import { z } from "zod";
import { kenyaLocalPhoneSchema } from "@/lib/validation/kenya-phone";
import { resetPasswordFieldSchemas, resetPasswordSchema, signUpFieldSchemas } from "@/features/auth/schemas";

// Reuses the exact same field schemas signup/reset-password already
// validate against, rather than redefining "what's a valid full name /
// phone / email / password" a third time — see those files for the
// underlying rules.

export const profileFieldSchemas = {
  fullName: signUpFieldSchemas.fullName,
  phone: kenyaLocalPhoneSchema,
};

const profileBaseSchema = z.object(profileFieldSchemas);
export const profileSchema = profileBaseSchema;

export const emailFieldSchemas = {
  email: signUpFieldSchemas.email,
};

const emailBaseSchema = z.object(emailFieldSchemas);
export const emailSchema = emailBaseSchema;

// Same shape/refinement as the signed-out reset-password flow — a new
// password + confirmation, no "current password" field (matches
// supabase/config.toml's secure_password_change = false, which doesn't
// require reauthentication to change a password from an active session).
export const passwordFieldSchemas = resetPasswordFieldSchemas;
export const passwordSchema = resetPasswordSchema;
