import type { Metadata } from "next";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { GeneralSettingsForm } from "@/components/admin/general-settings-form";
import { HeadScriptsForm } from "@/components/admin/head-scripts-form";
import { getSystemSettingString } from "@/lib/system-settings";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Settings — HarakaGari Admin",
};

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const [whatsappContactNumber, customHeadScripts] = await Promise.all([
    getSystemSettingString(supabase, "whatsapp_contact_number"),
    getSystemSettingString(supabase, "custom_head_scripts"),
  ]);

  return (
    <>
      <AdminTopbar title="Settings" />
      <main className="flex-1 px-7 py-6">
        <GeneralSettingsForm whatsappContactNumber={whatsappContactNumber} />
        <HeadScriptsForm customHeadScripts={customHeadScripts} />
      </main>
    </>
  );
}
