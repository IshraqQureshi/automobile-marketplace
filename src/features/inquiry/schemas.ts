import { z } from "zod";
import { kenyaLocalPhoneSchema } from "@/lib/validation/kenya-phone";

export const inquiryNameSchema = z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name is too long");
export const inquiryEmailSchema = z.string().trim().min(1, "Email is required").email("Enter a valid email address");
// Reuses the same local-number-without-prefix convention as every other
// phone field in the app (the form itself shows a fixed "+254" chip) —
// stored with the prefix prepended, matching account-profile-form.tsx.
export const inquiryPhoneSchema = kenyaLocalPhoneSchema;
export const inquiryMessageSchema = z
  .string()
  .trim()
  .min(10, "Message must be at least 10 characters")
  .max(2000, "Message must be under 2000 characters");

export const inquiryFieldSchemas = {
  name: inquiryNameSchema,
  email: inquiryEmailSchema,
  phone: inquiryPhoneSchema,
  message: inquiryMessageSchema,
};
