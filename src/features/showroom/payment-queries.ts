import type { createClient } from "@/lib/supabase/server";
import { computeSubscriptionUrgency, type SubscriptionUrgency } from "@/features/admin/payment-queries";
import type { PAYMENT_METHODS } from "@/features/admin/payment-schemas";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Read-only mirror of admin/payment-queries.ts's SubscriptionPaymentListItem,
// scoped to one showroom (no showroomId/showroomName — the caller already
// knows which showroom this is) — manual_payments_select_own_showroom
// (20260913030000) is what actually restricts a real query to the
// caller's own showroom; this just shapes the result the same way.
export interface ShowroomPaymentItem {
  id: string;
  amount: number;
  currency: string;
  paymentMethod: (typeof PAYMENT_METHODS)[number];
  reference: string | null;
  notes: string | null;
  status: "RECORDED" | "VOIDED";
  startDate: string;
  endDate: string;
  createdAt: string;
}

/** Every subscription payment ever recorded for one showroom — a full history, not just the current period. */
export async function getMyShowroomPayments(supabase: SupabaseServerClient, showroomId: string): Promise<ShowroomPaymentItem[]> {
  const { data } = await supabase
    .from("manual_payments")
    .select("id, amount, currency, payment_method, reference, notes, status, subscription_start_date, subscription_end_date, created_at")
    .eq("showroom_id", showroomId)
    .order("subscription_end_date", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    amount: row.amount,
    currency: row.currency,
    paymentMethod: row.payment_method as (typeof PAYMENT_METHODS)[number],
    reference: row.reference,
    notes: row.notes,
    status: row.status,
    startDate: row.subscription_start_date!,
    endDate: row.subscription_end_date!,
    createdAt: row.created_at,
  }));
}

export interface CurrentSubscriptionStatus {
  urgency: SubscriptionUrgency;
  endDate: string;
}

/** The most recent non-voided period's own status — null when this showroom has no subscription payment on record at all yet. */
export function getCurrentSubscriptionStatus(payments: ShowroomPaymentItem[]): CurrentSubscriptionStatus | null {
  const current = payments.filter((p) => p.status !== "VOIDED").sort((a, b) => b.endDate.localeCompare(a.endDate))[0];
  if (!current) return null;
  return { urgency: computeSubscriptionUrgency(current.endDate), endDate: current.endDate };
}
