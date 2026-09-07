import type { Metadata } from "next";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { AppointmentList } from "@/components/appointment/appointment-list";
import { getAllAppointments } from "@/features/appointment/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Appointments — HarakaGari Admin",
};

export default async function AdminAppointmentsPage() {
  const supabase = await createClient();
  const items = await getAllAppointments(supabase);

  return (
    <>
      <AdminTopbar title="Appointments" />
      <main className="flex-1 px-7 py-6">
        <AppointmentList items={items} showShowroomColumn />
      </main>
    </>
  );
}
