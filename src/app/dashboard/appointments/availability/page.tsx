import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AvailabilitySettings } from "@/components/dashboard/availability-settings";
import { getShowroomAvailability, getShowroomSlotConfig } from "@/features/appointment/queries";
import { requireApprovedOwnerShowroom } from "@/features/showroom/my-showroom";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Test Drive Availability — HarakaGari",
};

export default async function DashboardAppointmentAvailabilityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const showroom = await requireApprovedOwnerShowroom(user.id);
  const [availability, slotConfig] = await Promise.all([
    getShowroomAvailability(supabase, showroom.id),
    getShowroomSlotConfig(supabase, showroom.id),
  ]);

  return (
    <div className="flex flex-col gap-4 p-7">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-lg font-semibold text-neutral-900">Test Drive Availability</h1>
        <Link href="/dashboard/appointments" className="text-sm font-medium text-brand hover:underline">
          ← Back to appointments
        </Link>
      </div>
      <AvailabilitySettings
        showroomId={showroom.id}
        initialSlotDurationMinutes={slotConfig?.slotDurationMinutes ?? 30}
        initialBufferMinutes={slotConfig?.bufferMinutes ?? 0}
        initialDays={availability.filter((a) => a.isAvailable).map((a) => ({ dayOfWeek: a.dayOfWeek, isAvailable: true, startTime: a.startTime.slice(0, 5), endTime: a.endTime.slice(0, 5) }))}
      />
    </div>
  );
}
