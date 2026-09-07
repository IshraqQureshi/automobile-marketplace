import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppointmentList } from "@/components/appointment/appointment-list";
import { getShowroomAppointments } from "@/features/appointment/queries";
import { requireApprovedOwnerShowroom } from "@/features/showroom/my-showroom";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Appointments — HarakaGari",
};

export default async function DashboardAppointmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const showroom = await requireApprovedOwnerShowroom(user.id);
  const items = await getShowroomAppointments(supabase, showroom.id);

  return (
    <div className="flex flex-col gap-4 p-7">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-lg font-semibold text-neutral-900">Appointments</h1>
        <Link
          href="/dashboard/appointments/availability"
          className="rounded-md border border-neutral-300 px-3.5 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
        >
          Manage test drive availability
        </Link>
      </div>
      <AppointmentList items={items} />
    </div>
  );
}
