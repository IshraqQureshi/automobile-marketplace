import type { Metadata } from "next";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { CommissionList } from "@/components/admin/commission-list";
import { PaymentList } from "@/components/admin/payment-list";
import { getSoldVehicleCommissions } from "@/features/admin/commission-queries";
import { getSubscriptionPayments } from "@/features/admin/payment-queries";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Payments — HarakaGari Admin",
};

export default async function AdminPaymentsPage() {
  const supabase = await createClient();

  const [payments, { data: showrooms, error: showroomsError }, commissionRows] = await Promise.all([
    getSubscriptionPayments(supabase),
    supabase.from("showrooms").select("id, business_name").order("business_name"),
    getSoldVehicleCommissions(supabase),
  ]);
  if (showroomsError) logger.error("Admin payments: failed to load showrooms for the picker", showroomsError);

  return (
    <>
      <AdminTopbar title="Payments" />
      <main className="flex-1 px-7 py-6">
        <PaymentList
          payments={payments}
          showrooms={(showrooms ?? []).map((s) => ({ id: s.id, businessName: s.business_name }))}
        />
        <CommissionList rows={commissionRows} />
      </main>
    </>
  );
}
