import { z } from "zod";
import { inquiryEmailSchema, inquiryNameSchema, inquiryPhoneSchema } from "@/features/inquiry/schemas";

// Contact fields are identical validators to the vehicle-inquiry/financing
// forms — reused directly rather than duplicated.
export { inquiryNameSchema, inquiryEmailSchema, inquiryPhoneSchema };

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}$/;

export const appointmentDateSchema = z
  .string()
  .trim()
  .regex(DATE_REGEX, "Choose a date")
  .refine((value) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parsed = new Date(`${value}T00:00:00`);
    return parsed >= today;
  }, "Choose a date that isn't in the past");

export const appointmentStartTimeSchema = z.string().trim().regex(TIME_REGEX, "Choose a time slot");

export const appointmentVehicleIdsSchema = z.array(z.string().uuid()).min(1, "Select at least one vehicle");

export const appointmentNotesSchema = z
  .string()
  .trim()
  .max(1000, "Notes must be under 1000 characters")
  .optional()
  .transform((value) => value || undefined);

export const appointmentFieldSchemas = {
  name: inquiryNameSchema,
  email: inquiryEmailSchema,
  phone: inquiryPhoneSchema,
  appointmentDate: appointmentDateSchema,
  startTime: appointmentStartTimeSchema,
  notes: appointmentNotesSchema,
};

const INTEGER_REGEX = /^\d+$/;

export const slotDurationMinutesSchema = z
  .string()
  .trim()
  .pipe(z.string().regex(INTEGER_REGEX, "Enter a valid slot length"))
  .transform(Number)
  .pipe(z.number().positive("Slot length must be greater than zero").max(480, "Slot length is too long"));

export const bufferMinutesSchema = z
  .string()
  .trim()
  .pipe(z.string().regex(INTEGER_REGEX, "Enter a valid buffer time"))
  .transform(Number)
  .pipe(z.number().min(0, "Buffer time can't be negative").max(240, "Buffer time is too long"));

export const availabilityFieldSchemas = {
  slotDurationMinutes: slotDurationMinutesSchema,
  bufferMinutes: bufferMinutesSchema,
};

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  RESCHEDULED: "Rescheduled",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
};
