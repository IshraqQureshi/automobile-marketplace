import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { renderSubscriptionReminderEmail } from "@/lib/email-templates";
import { logger } from "@/lib/logger";
import { computeSubscriptionUrgency } from "./payment-queries";

interface CandidateRow {
  id: string;
  showroom_id: string;
  subscription_end_date: string;
  showrooms: { business_name: string } | null;
}

/**
 * Shared by the /api/cron/subscription-reminders route (real scheduled
 * runs — see vercel.json) and the admin-triggered "Send reminders now"
 * action (used both for testing and as a manual fallback if the schedule
 * isn't wired up in a given environment). Uses the service-role client
 * throughout — this isn't invoked in response to any specific user's
 * request, so there's no caller session to scope an RLS-bound client to.
 *
 * Reminder-eligible: status RECORDED, expiring soon or already overdue,
 * and reminder_sent_at is null — a reminder fires exactly ONCE per
 * subscription period, never repeats daily. Only the LATEST (by end date)
 * row per showroom is considered, so an old, already-superseded period
 * never triggers a stale reminder for a showroom that has since renewed.
 */
export async function sendDueSubscriptionReminders(): Promise<{ remindersSent: number }> {
  const admin = createAdminClient();

  const { data: rows, error } = await admin
    .from("manual_payments")
    .select("id, showroom_id, subscription_end_date, showrooms(business_name)")
    .eq("status", "RECORDED")
    .not("showroom_id", "is", null)
    .is("reminder_sent_at", null);
  if (error) {
    logger.error("Failed to load subscription-reminder candidates", error);
    return { remindersSent: 0 };
  }

  const candidates = (rows as CandidateRow[] | null) ?? [];
  const latestByShowroom = new Map<string, CandidateRow>();
  for (const row of candidates) {
    const current = latestByShowroom.get(row.showroom_id);
    if (!current || row.subscription_end_date > current.subscription_end_date) latestByShowroom.set(row.showroom_id, row);
  }

  const dueRows = [...latestByShowroom.values()].filter((row) => computeSubscriptionUrgency(row.subscription_end_date) !== "ACTIVE");
  if (dueRows.length === 0) return { remindersSent: 0 };

  const { data: adminProfiles } = await admin.from("profiles").select("id").eq("role", "ADMIN");
  const recipientEmails: string[] = [];
  for (const profile of adminProfiles ?? []) {
    const { data: userResult } = await admin.auth.admin.getUserById(profile.id);
    if (userResult?.user?.email) recipientEmails.push(userResult.user.email);
  }

  let remindersSent = 0;
  for (const row of dueRows) {
    const urgency = computeSubscriptionUrgency(row.subscription_end_date);
    const { subject, html } = renderSubscriptionReminderEmail({
      showroomName: row.showrooms?.business_name ?? "Unknown showroom",
      endDate: row.subscription_end_date,
      urgency: urgency === "OVERDUE" ? "OVERDUE" : "EXPIRING_SOON",
    });

    const results = await Promise.all(recipientEmails.map((to) => sendEmail({ to, subject, html })));
    if (results.some(Boolean)) {
      await admin.from("manual_payments").update({ reminder_sent_at: new Date().toISOString() }).eq("id", row.id);
      remindersSent += 1;
    } else {
      logger.warn("Subscription reminder email failed to send to every admin", { showroomId: row.showroom_id, recipientCount: recipientEmails.length });
    }
  }

  return { remindersSent };
}
