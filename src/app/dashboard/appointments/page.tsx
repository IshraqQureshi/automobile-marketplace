import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppointmentList } from "@/components/appointment/appointment-list";
import { AvailabilitySettings } from "@/components/dashboard/availability-settings";
import { getShowroomAppointments, getShowroomAvailability, getShowroomSlotConfig } from "@/features/appointment/queries";
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
  const [items, availability, slotConfig] = await Promise.all([
    getShowroomAppointments(supabase, showroom.id),
    getShowroomAvailability(supabase, showroom.id),
    getShowroomSlotConfig(supabase, showroom.id),
  ]);

  return (
    <div className="flex flex-col gap-6 p-7">
      <AvailabilitySettings
        showroomId={showroom.id}
        initialSlotDurationMinutes={slotConfig?.slotDurationMinutes ?? 30}
        initialBufferMinutes={slotConfig?.bufferMinutes ?? 0}
        initialDays={availability.filter((a) => a.isAvailable).map((a) => ({ dayOfWeek: a.dayOfWeek, isAvailable: true, startTime: a.startTime.slice(0, 5), endTime: a.endTime.slice(0, 5) }))}
      />
      <AppointmentList items={items} />
    </div>
  );
}
