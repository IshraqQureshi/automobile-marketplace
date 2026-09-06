import { NextResponse } from "next/server";
import { sendDueSubscriptionReminders } from "@/features/admin/subscription-reminders";

/**
 * Called on a schedule (see vercel.json's `crons` entry — Vercel signs
 * every cron invocation with this same bearer secret) to send the
 * one-time showroom-subscription expiry reminder to every admin. Refuses
 * outright if CRON_SECRET isn't configured, rather than falling open to
 * an unauthenticated caller — this triggers a real email send, so an
 * open endpoint would let anyone spam every admin's inbox on demand.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendDueSubscriptionReminders();
  return NextResponse.json(result);
}
