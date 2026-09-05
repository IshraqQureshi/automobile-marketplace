import { z } from "zod";
import { kenyaLocalPhoneOptionalSchema } from "@/lib/validation/kenya-phone";
import { resetPasswordFieldSchemas, resetPasswordSchema, signUpFieldSchemas } from "@/features/auth/schemas";

// Reuses the exact same field schemas signup/reset-password already
// validate against, rather than redefining "what's a valid full name /
// phone / email / password" a third time — see those files for the
// underlying rules.

export const profileFieldSchemas = {
  fullName: signUpFieldSchemas.fullName,
  // Optional, not signUpFieldSchemas'/kenyaLocalPhoneSchema's required
  // variant — Google OAuth (supabase/config.toml's auth.external.google,
  // enabled) never populates raw_user_meta_data.phone, so handle_new_user
  // leaves profiles.phone null for any account that signed up that way.
  // Requiring a valid Kenyan number here would block that user from ever
  // saving just their name.
  phone: kenyaLocalPhoneOptionalSchema,
};

export const profileSchema = z.object(profileFieldSchemas);

export const emailFieldSchemas = {
  email: signUpFieldSchemas.email,
};

export const emailSchema = z.object(emailFieldSchemas);

// Same shape/refinement as the signed-out reset-password flow — a new
// password + confirmation, no "current password" field (matches
// supabase/config.toml's secure_password_change = false, which doesn't
// require reauthentication to change a password from an active session).
export const passwordFieldSchemas = resetPasswordFieldSchemas;
export const passwordSchema = resetPasswordSchema;
