import { z } from "zod";
import { kenyaLocalPhoneSchema } from "@/lib/validation/kenya-phone";

// Password minimum matches supabase/config.toml's auth.minimum_password_length.
// Keep these in sync — Supabase is the actual enforcement point; this is
// only for fast client/server-side feedback before the request round-trips.
export const PASSWORD_MIN_LENGTH = 6;

// Base object (not yet cross-field-refined) so its `.shape` stays available
// for per-field client-side validation (validateField in auth-card.tsx) —
// a z.object().refine() result no longer exposes `.shape` directly.
const signUpBaseSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(200),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  phone: kenyaLocalPhoneSchema,
  password: z.string().min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  termsAccepted: z.literal("true", { message: "You must agree to the Terms of Service and Privacy Policy" }),
});

export const signUpFieldSchemas = signUpBaseSchema.shape;

export const signUpSchema = signUpBaseSchema.refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const signInBaseSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const signInFieldSchemas = signInBaseSchema.shape;
export const signInSchema = signInBaseSchema;

const requestPasswordResetBaseSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
});

export const requestPasswordResetFieldSchemas = requestPasswordResetBaseSchema.shape;
export const requestPasswordResetSchema = requestPasswordResetBaseSchema;

const resetPasswordBaseSchema = z.object({
  password: z.string().min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`),
  confirmPassword: z.string().min(1, "Please confirm your password"),
});

export const resetPasswordFieldSchemas = resetPasswordBaseSchema.shape;

export const resetPasswordSchema = resetPasswordBaseSchema.refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export interface AuthActionState {
  status: "idle" | "error" | "confirmation_required";
  message?: string;
  fieldErrors?: Partial<Record<string, string>>;
}

// Kept out of actions.ts: a "use server" module may only export async
// functions, not plain values or sync functions.
export const initialAuthActionState: AuthActionState = { status: "idle" };

// Re-exported for existing importers — the implementation itself lives in
// src/lib/validation/field-errors.ts so non-auth features (e.g. showroom
// registration) can use it without importing an auth-specific module.
export { fieldErrorsFrom } from "@/lib/validation/field-errors";
