import { z } from "zod";
import { inquiryEmailSchema, inquiryNameSchema, inquiryPhoneSchema } from "@/features/inquiry/schemas";

// Contact fields are identical validators to the vehicle-inquiry form
// (same "name/email/phone" shape, same rules) — reused directly rather
// than duplicated.
export { inquiryNameSchema, inquiryEmailSchema, inquiryPhoneSchema };

export const EMPLOYMENT_STATUS_OPTIONS = [
  { value: "EMPLOYED", label: "Employed" },
  { value: "SELF_EMPLOYED", label: "Self-employed" },
  { value: "BUSINESS_OWNER", label: "Business owner" },
] as const;

const DECIMAL_REGEX = /^\d+(\.\d+)?$/;
const INTEGER_REGEX = /^\d+$/;

export const financingEmploymentStatusSchema = z.enum(["EMPLOYED", "SELF_EMPLOYED", "BUSINESS_OWNER"], {
  message: "Choose your employment status.",
});

// Same trim → regex → transform → range shape as vehiclePriceSchema
// (src/features/vehicle/schemas.ts) — validates the raw form-data string
// first so an empty/non-numeric value gets a clear message, since
// useFieldValidation calls safeParse with a raw string on blur.
export const financingMonthlyIncomeSchema = z
  .string()
  .trim()
  .pipe(z.string().regex(DECIMAL_REGEX, "Enter a valid monthly income"))
  .transform(Number)
  .pipe(z.number().positive("Monthly income must be greater than zero"));

export const financingNationalIdSchema = z.string().trim().min(4, "Enter a valid ID/passport number").max(20, "ID/passport number is too long");

export const financingDesiredDownPaymentSchema = z
  .string()
  .trim()
  .pipe(z.string().regex(DECIMAL_REGEX, "Enter a valid down payment"))
  .transform(Number)
  .pipe(z.number().min(0, "Down payment can't be negative"));

// A required 0-100 percent, used when the vehicle's own down payment type
// is PERCENT — deliberately NOT reusing vehicleDownPaymentPercentSchema
// (src/features/vehicle/schemas.ts), which is `.optional()` because an
// admin editing a vehicle may legitimately leave financing unconfigured.
// An applicant filling out THIS form has no such legitimate "leave it
// blank" case — reusing the optional schema let an empty field silently
// resolve to a KES 0 down payment with no validation error at all (unlike
// the FIXED-type branch's financingDesiredDownPaymentSchema above, which
// has always correctly required a value).
export const financingDesiredDownPaymentPercentSchema = z
  .string()
  .trim()
  .pipe(z.string().regex(DECIMAL_REGEX, "Enter a valid down payment percentage"))
  .transform(Number)
  .pipe(z.number().min(0, "Down payment can't be negative").max(100, "Down payment can't exceed 100%"));

export const financingDesiredTenureMonthsSchema = z
  .string()
  .trim()
  .pipe(z.string().regex(INTEGER_REGEX, "Choose a loan term"))
  .transform(Number)
  .pipe(z.number().positive("Choose a loan term"));

export const financingNotesSchema = z
  .string()
  .trim()
  .max(1000, "Notes must be under 1000 characters")
  .optional()
  .transform((value) => value || undefined);

// A vehicle's own tracker fee options are just a duration label ("1 Year",
// "2 Years") — same shape the finance calculator already renders (see
// FinancingCalculator's trackerOptions prop), reused here so this form can
// offer the same choice, not just down payment/tenure.
export const financingDesiredTrackerDurationSchema = z
  .string()
  .trim()
  .max(20, "Invalid tracker option")
  .optional()
  .transform((value) => value || undefined);

export const financingApplicationFieldSchemas = {
  name: inquiryNameSchema,
  email: inquiryEmailSchema,
  phone: inquiryPhoneSchema,
  employmentStatus: financingEmploymentStatusSchema,
  monthlyIncome: financingMonthlyIncomeSchema,
  nationalId: financingNationalIdSchema,
  desiredDownPayment: financingDesiredDownPaymentSchema,
  desiredTenureMonths: financingDesiredTenureMonthsSchema,
  desiredTrackerDuration: financingDesiredTrackerDurationSchema,
  notes: financingNotesSchema,
};
