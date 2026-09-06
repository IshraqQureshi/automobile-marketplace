import { z } from "zod";

// ADM-006 (Manual Payment Entry), extended to also model a showroom
// subscription's payment period (see the migration adding showroom_id/
// subscription_start_date/subscription_end_date to manual_payments).
//
// No existing payment-method catalog exists elsewhere in this codebase —
// a fixed list matching how a Kenyan business actually gets paid, same
// "server only needs to guard against a direct action call, not free-text
// input" reasoning as vehicle FUEL_TYPES/TRANSMISSIONS.
export const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "MPESA", "CHEQUE", "OTHER"] as const;
export const paymentMethodSchema = z.enum(PAYMENT_METHODS);

export const PAYMENT_METHOD_LABELS: Record<(typeof PAYMENT_METHODS)[number], string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
  MPESA: "M-Pesa",
  CHEQUE: "Cheque",
  OTHER: "Other",
};

const DECIMAL_REGEX = /^\d+(\.\d+)?$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const paymentAmountSchema = z
  .string()
  .trim()
  .pipe(z.string().regex(DECIMAL_REGEX, "Enter a valid amount"))
  .transform(Number)
  .pipe(z.number().positive("Amount must be greater than zero").max(99_999_999, "Amount is too large"));

export const paymentReferenceSchema = z
  .string()
  .trim()
  .max(100, "Reference must be under 100 characters")
  .transform((value) => value || undefined);

export const paymentNotesSchema = z
  .string()
  .trim()
  .max(1000, "Notes must be under 1000 characters")
  .transform((value) => value || undefined);

export const subscriptionStartDateSchema = z.string().trim().regex(DATE_REGEX, "Enter a valid start date");
export const subscriptionEndDateSchema = z.string().trim().regex(DATE_REGEX, "Enter a valid end date");
export const showroomIdSchema = z.string().uuid("Choose a showroom");

export const subscriptionPaymentFieldSchemas = {
  showroomId: showroomIdSchema,
  amount: paymentAmountSchema,
  paymentMethod: paymentMethodSchema,
  reference: paymentReferenceSchema,
  notes: paymentNotesSchema,
  startDate: subscriptionStartDateSchema,
  endDate: subscriptionEndDateSchema,
};

const subscriptionDatesValid = (data: { startDate: string; endDate: string }) => data.endDate >= data.startDate;
const SUBSCRIPTION_DATES_ISSUE = { message: "End date must be on or after the start date", path: ["endDate"] };

export const subscriptionPaymentSchema = z.object(subscriptionPaymentFieldSchemas).refine(subscriptionDatesValid, SUBSCRIPTION_DATES_ISSUE);

// Editing an existing payment never changes which showroom it belongs to —
// a payment is a record of what actually happened, not something that gets
// reassigned. Same fields otherwise.
export const editSubscriptionPaymentFieldSchemas = {
  amount: paymentAmountSchema,
  paymentMethod: paymentMethodSchema,
  reference: paymentReferenceSchema,
  notes: paymentNotesSchema,
  startDate: subscriptionStartDateSchema,
  endDate: subscriptionEndDateSchema,
};

export const editSubscriptionPaymentSchema = z.object(editSubscriptionPaymentFieldSchemas).refine(subscriptionDatesValid, SUBSCRIPTION_DATES_ISSUE);
