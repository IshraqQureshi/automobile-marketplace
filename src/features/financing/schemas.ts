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

export const financingApplicationFieldSchemas = {
  name: inquiryNameSchema,
  email: inquiryEmailSchema,
  phone: inquiryPhoneSchema,
  employmentStatus: financingEmploymentStatusSchema,
  monthlyIncome: financingMonthlyIncomeSchema,
  nationalId: financingNationalIdSchema,
  desiredDownPayment: financingDesiredDownPaymentSchema,
  desiredTenureMonths: financingDesiredTenureMonthsSchema,
  notes: financingNotesSchema,
};
