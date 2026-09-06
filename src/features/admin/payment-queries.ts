import type { createClient } from "@/lib/supabase/server";
import type { PAYMENT_METHODS } from "./payment-schemas";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface SubscriptionPaymentListItem {
  id: string;
  showroomId: string;
  showroomName: string;
  amount: number;
  currency: string;
  paymentMethod: (typeof PAYMENT_METHODS)[number];
  reference: string | null;
  notes: string | null;
  status: "RECORDED" | "VOIDED";
  startDate: string;
  endDate: string;
  createdAt: string;
  reminderSentAt: string | null;
}

export type SubscriptionUrgency = "ACTIVE" | "EXPIRING_SOON" | "OVERDUE";

// How many days out "expiring soon" starts — a plain business rule, not a
// system_settings row, since there's no admin-configurable-settings UI
// built yet and this is the only place it's read.
export const EXPIRING_SOON_WINDOW_DAYS = 14;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Pure date math, deliberately callable from both client UI (row badges)
 * and the server-only reminder sender — no Supabase/network dependency.
 * `endDate` is a plain "YYYY-MM-DD" string (a Postgres `date`, no time/zone
 * component) — parsed at local midnight so "today" comparisons match what
 * an admin looking at a calendar date would expect.
 */
export function computeSubscriptionUrgency(endDate: string, now: Date = new Date()): SubscriptionUrgency {
  const end = new Date(`${endDate}T00:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((end.getTime() - today.getTime()) / MS_PER_DAY);
  if (diffDays < 0) return "OVERDUE";
  if (diffDays <= EXPIRING_SOON_WINDOW_DAYS) return "EXPIRING_SOON";
  return "ACTIVE";
}

const PAYMENT_SELECT_COLUMNS =
  "id, showroom_id, amount, currency, payment_method, reference, notes, status, subscription_start_date, subscription_end_date, created_at, reminder_sent_at, showrooms(business_name)";

interface PaymentRow {
  id: string;
  showroom_id: string | null;
  amount: number;
  currency: string;
  payment_method: string;
  reference: string | null;
  notes: string | null;
  status: "RECORDED" | "VOIDED";
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  created_at: string;
  reminder_sent_at: string | null;
  showrooms: { business_name: string } | null;
}

function rowToListItem(row: PaymentRow): SubscriptionPaymentListItem {
  return {
    id: row.id,
    showroomId: row.showroom_id!,
    showroomName: row.showrooms?.business_name ?? "Unknown showroom",
    amount: row.amount,
    currency: row.currency,
    paymentMethod: row.payment_method as (typeof PAYMENT_METHODS)[number],
    reference: row.reference,
    notes: row.notes,
    status: row.status,
    startDate: row.subscription_start_date!,
    endDate: row.subscription_end_date!,
    createdAt: row.created_at,
    reminderSentAt: row.reminder_sent_at,
  };
}

/** Every showroom-subscription payment ever recorded (a full audit trail — not filtered to "current"). */
export async function getSubscriptionPayments(supabase: SupabaseServerClient): Promise<SubscriptionPaymentListItem[]> {
  const { data } = await supabase
    .from("manual_payments")
    .select(PAYMENT_SELECT_COLUMNS)
    .not("showroom_id", "is", null)
    .order("subscription_end_date", { ascending: true });
  return ((data as PaymentRow[] | null) ?? []).map(rowToListItem);
}

/**
 * One showroom can have several payment rows over time (each renewal is a
 * new row, never an edit-in-place of an old period) — only the row with
 * the LATEST end date per showroom reflects that showroom's real current
 * standing. An older, already-superseded row must never make a
 * since-renewed showroom look overdue again.
 */
export function latestPerShowroom(items: SubscriptionPaymentListItem[]): SubscriptionPaymentListItem[] {
  const latest = new Map<string, SubscriptionPaymentListItem>();
  for (const item of items) {
    if (item.status === "VOIDED") continue;
    const current = latest.get(item.showroomId);
    if (!current || item.endDate > current.endDate) latest.set(item.showroomId, item);
  }
  return [...latest.values()];
}

/** Showrooms whose CURRENT subscription is expiring soon or already overdue — the "dues" view. */
export async function getDueSubscriptions(supabase: SupabaseServerClient): Promise<SubscriptionPaymentListItem[]> {
  const all = await getSubscriptionPayments(supabase);
  return latestPerShowroom(all)
    .filter((item) => computeSubscriptionUrgency(item.endDate) !== "ACTIVE")
    .sort((a, b) => a.endDate.localeCompare(b.endDate));
}

export async function getDueSubscriptionsCount(supabase: SupabaseServerClient): Promise<number> {
  return (await getDueSubscriptions(supabase)).length;
}
