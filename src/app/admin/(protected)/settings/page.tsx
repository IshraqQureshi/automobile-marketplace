import type { Metadata } from "next";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { GeneralSettingsForm } from "@/components/admin/general-settings-form";
import { getSystemSettingString } from "@/lib/system-settings";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Settings — HarakaGari Admin",
};

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const whatsappContactNumber = await getSystemSettingString(supabase, "whatsapp_contact_number");

  return (
    <>
      <AdminTopbar title="Settings" />
      <main className="flex-1 px-7 py-6">
        <GeneralSettingsForm whatsappContactNumber={whatsappContactNumber} />
      </main>
    </>
  );
}
