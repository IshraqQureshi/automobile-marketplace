import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { VehicleList } from "@/components/dashboard/vehicle-list";
import { requireApprovedOwnerShowroom } from "@/features/showroom/my-showroom";
import { VEHICLE_SELECT_COLUMNS, vehicleRowToListItem } from "@/features/vehicle/types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Vehicles — HarakaGari",
};

export default async function DashboardVehiclesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const showroom = await requireApprovedOwnerShowroom(user.id);

  const { data: vehicles } = await supabase
    .from("vehicles")
    .select(VEHICLE_SELECT_COLUMNS)
    .eq("showroom_id", showroom.id)
    .order("created_at", { ascending: false });

  const items = (vehicles ?? []).map((vehicle) =>
    vehicleRowToListItem(vehicle, (storagePath) => supabase.storage.from("vehicle-media").getPublicUrl(storagePath).data.publicUrl),
  );

  return (
    <div className="p-7">
      <VehicleList vehicles={items} />
    </div>
  );
}
