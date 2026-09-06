import type { Metadata } from "next";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { FinancingApplicationList } from "@/components/financing/financing-application-list";
import { getAllFinancingApplications } from "@/features/financing/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Financing Applications — HarakaGari Admin",
};

export default async function AdminFinancingPage() {
  const supabase = await createClient();
  const items = await getAllFinancingApplications(supabase);

  return (
    <>
      <AdminTopbar title="Financing Applications" />
      <main className="flex-1 px-7 py-6">
        <FinancingApplicationList items={items} showShowroomColumn />
      </main>
    </>
  );
}
