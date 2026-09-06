import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { InquiryList } from "@/components/inquiry/inquiry-list";
import { getShowroomInquiries } from "@/features/inquiry/queries";
import { requireApprovedOwnerShowroom } from "@/features/showroom/my-showroom";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Inquiries — HarakaGari",
};

export default async function DashboardInquiriesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const showroom = await requireApprovedOwnerShowroom(user.id);
  const items = await getShowroomInquiries(supabase, showroom.id);

  return (
    <div className="p-7">
      <InquiryList items={items} />
    </div>
  );
}
