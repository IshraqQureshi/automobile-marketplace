import type { Metadata } from "next";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { InquiryList } from "@/components/inquiry/inquiry-list";
import { getAllInquiries } from "@/features/inquiry/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Inquiries — HarakaGari Admin",
};

export default async function AdminInquiriesPage() {
  const supabase = await createClient();
  const items = await getAllInquiries(supabase);

  return (
    <>
      <AdminTopbar title="Inquiries" />
      <main className="flex-1 px-7 py-6">
        <InquiryList items={items} showShowroomColumn />
      </main>
    </>
  );
}
