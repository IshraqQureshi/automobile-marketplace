import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FinancingApplicationList } from "@/components/financing/financing-application-list";
import { getShowroomFinancingApplications } from "@/features/financing/queries";
import { requireApprovedOwnerShowroom } from "@/features/showroom/my-showroom";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Financing Applications — HarakaGari",
};

export default async function DashboardFinancingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const showroom = await requireApprovedOwnerShowroom(user.id);
  const items = await getShowroomFinancingApplications(supabase, showroom.id);

  return (
    <div className="p-7">
      <FinancingApplicationList items={items} />
    </div>
  );
}
