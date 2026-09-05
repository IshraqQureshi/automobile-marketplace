import { z } from "zod";

// Kenyan mobile numbers without the leading 0 or country code, e.g. "712345678"
// (the UI supplies a fixed "+254" prefix — see auth-card.tsx / register-showroom-form.tsx).
const KENYA_LOCAL_PHONE_REGEX = /^[17]\d{8}$/;

// The input's own placeholder ("7xx xxx xxx") models spaced input, and
// Kenyan numbers are very commonly typed with a leading 0 out of habit even
// though the UI shows a separate +254 prefix — strip both before
// validating, rather than rejecting input the UI itself invites.
export const kenyaLocalPhoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s-]/g, "").replace(/^0/, ""))
  .pipe(z.string().regex(KENYA_LOCAL_PHONE_REGEX, "Enter a valid phone number (e.g. 712345678)"));

// Stored phone numbers carry a "+254" prefix already (see signUpAction /
// registerShowroomAction) — strip it back off wherever a form re-displays
// one of these numbers in a local-number input with its own fixed "+254"
// prefix chip.
export function stripKenyaPrefix(phone: string) {
  return phone.startsWith("+254") ? phone.slice(4) : phone;
}
