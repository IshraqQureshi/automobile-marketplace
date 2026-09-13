import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PAYMENT_METHOD_LABELS } from "@/features/admin/payment-schemas";
import { getCurrentSubscriptionStatus, getMyShowroomPayments } from "@/features/showroom/payment-queries";
import { requireApprovedOwnerShowroom } from "@/features/showroom/my-showroom";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Payments — HarakaGari",
};

const currencyFormatter = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" });

const URGENCY_COPY = {
  ACTIVE: { label: "Active", classes: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  EXPIRING_SOON: { label: "Expiring soon", classes: "border-amber-200 bg-amber-50 text-amber-800" },
  OVERDUE: { label: "Overdue", classes: "border-red-200 bg-red-50 text-red-800" },
} as const;

export default async function DashboardPaymentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const showroom = await requireApprovedOwnerShowroom(user.id);
  const payments = await getMyShowroomPayments(supabase, showroom.id);
  const current = getCurrentSubscriptionStatus(payments);

  return (
    <div className="p-7">
      <h1 className="mb-1 font-display text-xl font-semibold text-neutral-900">Payments</h1>
      <p className="mb-6 text-sm text-neutral-500">Your listing subscription payment history, recorded by HarakaGari.</p>

      {current ? (
        <div className={`mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-5 ${URGENCY_COPY[current.urgency].classes}`}>
          <div>
            <p className="text-xs font-semibold tracking-wide uppercase opacity-70">Current subscription</p>
            <p className="mt-0.5 text-sm">
              {current.urgency === "OVERDUE" ? "Ended" : "Ends"} {dateFormatter.format(new Date(`${current.endDate}T00:00:00`))}
            </p>
          </div>
          <span className="rounded-full bg-white/60 px-3 py-1 text-xs font-semibold">{URGENCY_COPY[current.urgency].label}</span>
        </div>
      ) : (
        <div className="mb-6 rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-8 text-center">
          <p className="text-sm font-medium text-neutral-500">No payment has been recorded for your showroom yet.</p>
        </div>
      )}

      {payments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-14 text-center">
          <p className="text-sm font-medium text-neutral-500">No payment history yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                <th className="px-5 py-3 font-semibold">Period</th>
                <th className="px-5 py-3 font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Method</th>
                <th className="px-5 py-3 font-semibold">Reference</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b border-neutral-100 last:border-b-0">
                  <td className="px-5 py-3 text-neutral-700">
                    {dateFormatter.format(new Date(`${payment.startDate}T00:00:00`))} – {dateFormatter.format(new Date(`${payment.endDate}T00:00:00`))}
                  </td>
                  <td className="px-5 py-3 font-medium text-neutral-800 tabular-nums">{currencyFormatter.format(payment.amount)}</td>
                  <td className="px-5 py-3 text-neutral-600">{PAYMENT_METHOD_LABELS[payment.paymentMethod]}</td>
                  <td className="px-5 py-3 text-neutral-500">{payment.reference ?? "—"}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        payment.status === "VOIDED" ? "bg-neutral-100 text-neutral-400" : "bg-neutral-100 text-neutral-700"
                      }`}
                    >
                      {payment.status === "VOIDED" ? "Voided" : "Recorded"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
