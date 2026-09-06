"use server";

import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { sendDueSubscriptionReminders } from "./subscription-reminders";
import { editSubscriptionPaymentSchema, subscriptionPaymentSchema } from "./payment-schemas";

export interface PaymentActionResult {
  error?: string;
}

// ADM-006 (Manual Payment Entry), extended for showroom subscriptions.
// Authorization is enforced by RLS (manual_payments_insert_admin_only
// requires is_admin() AND recorded_by = auth.uid(); _update_admin_only
// requires is_admin()) — no redundant application-level role check, same
// convention as every other admin action in this codebase.
const NOT_FOUND_ERROR = "Not found, or you don't have permission to do that.";

function readFields(formData: FormData) {
  return {
    amount: String(formData.get("amount") ?? ""),
    paymentMethod: String(formData.get("paymentMethod") ?? ""),
    reference: String(formData.get("reference") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    startDate: String(formData.get("startDate") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
  };
}

export async function createSubscriptionPaymentAction(formData: FormData): Promise<PaymentActionResult> {
  const parsed = subscriptionPaymentSchema.safeParse({
    showroomId: formData.get("showroomId"),
    ...readFields(formData),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid payment details." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { error } = await supabase.from("manual_payments").insert({
    showroom_id: parsed.data.showroomId,
    amount: parsed.data.amount,
    currency: "KES",
    payment_method: parsed.data.paymentMethod,
    reference: parsed.data.reference ?? null,
    notes: parsed.data.notes ?? null,
    subscription_start_date: parsed.data.startDate,
    subscription_end_date: parsed.data.endDate,
    recorded_by: user.id,
    status: "RECORDED",
  });
  if (error) {
    logger.error("Failed to record subscription payment", error, { showroomId: parsed.data.showroomId });
    return { error: "Failed to record this payment." };
  }

  revalidatePath("/admin/payments");
  revalidatePath("/admin");
  return {};
}

export async function updateSubscriptionPaymentAction(id: string, formData: FormData): Promise<PaymentActionResult> {
  const parsed = editSubscriptionPaymentSchema.safeParse(readFields(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid payment details." };

  const supabase = await createClient();

  // Only reset reminder_sent_at when the end date is actually changing —
  // a real bug caught in code review: unconditionally nulling it on every
  // edit meant fixing a typo in the amount/reference/notes on an
  // already-reminded, still-overdue period would silently make it
  // eligible for a second reminder, even though nothing about its actual
  // expiry changed.
  const { data: existing, error: fetchError } = await supabase.from("manual_payments").select("subscription_end_date").eq("id", id).maybeSingle();
  if (fetchError) {
    logger.error("Failed to load existing payment before update", fetchError, { id });
    return { error: "Failed to update this payment." };
  }
  if (!existing) return { error: NOT_FOUND_ERROR };
  const endDateChanged = existing.subscription_end_date !== parsed.data.endDate;

  const { data, error } = await supabase
    .from("manual_payments")
    .update({
      amount: parsed.data.amount,
      payment_method: parsed.data.paymentMethod,
      reference: parsed.data.reference ?? null,
      notes: parsed.data.notes ?? null,
      subscription_start_date: parsed.data.startDate,
      subscription_end_date: parsed.data.endDate,
      ...(endDateChanged ? { reminder_sent_at: null } : {}),
    })
    .eq("id", id)
    .select("id");
  if (error) {
    logger.error("Failed to update subscription payment", error, { id });
    return { error: "Failed to update this payment." };
  }
  if (!data || data.length === 0) return { error: NOT_FOUND_ERROR };

  revalidatePath("/admin/payments");
  revalidatePath("/admin");
  return {};
}

export async function voidSubscriptionPaymentAction(id: string): Promise<PaymentActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("manual_payments").update({ status: "VOIDED" }).eq("id", id).select("id");
  if (error) {
    logger.error("Failed to void subscription payment", error, { id });
    return { error: "Failed to void this payment." };
  }
  if (!data || data.length === 0) return { error: NOT_FOUND_ERROR };

  revalidatePath("/admin/payments");
  revalidatePath("/admin");
  return {};
}

export interface SendRemindersResult extends PaymentActionResult {
  remindersSent?: number;
}

/**
 * Manual fallback/testing path for the same logic the scheduled
 * /api/cron/subscription-reminders route runs — lets an admin trigger it
 * on demand without needing a real cron scheduler wired up (e.g. in an
 * environment that hasn't configured one yet).
 */
export async function sendSubscriptionRemindersNowAction(): Promise<SendRemindersResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "ADMIN") return { error: "You must be signed in as an admin to do that." };

  const result = await sendDueSubscriptionReminders();
  revalidatePath("/admin/payments");
  return { remindersSent: result.remindersSent };
}
