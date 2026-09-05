import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { VehicleList, type VehicleListItem } from "@/components/dashboard/vehicle-list";
import { getOwnerShowroom } from "@/features/showroom/my-showroom";
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

  const showroom = await getOwnerShowroom(user.id);
  if (!showroom) redirect("/ready-to-sell");
  // Vehicle management is approved-only functionality (SHR-004) — the
  // sidebar already hides this link for a non-APPROVED showroom, but a
  // direct URL visit must be blocked too, not just visually hidden.
  if (showroom.status !== "APPROVED") redirect("/dashboard");

  const [{ data: vehicles }, { data: vehicleTypes }] = await Promise.all([
    supabase
      .from("vehicles")
      .select(
        "id, title, make, model, variant, year, price, mileage, fuel_type, transmission, body_type, color, description, status, vehicle_media(id, storage_path, is_primary, sort_order)",
      )
      .eq("showroom_id", showroom.id)
      .order("created_at", { ascending: false }),
    supabase.from("vehicle_types").select("name").order("name"),
  ]);

  const items: VehicleListItem[] = (vehicles ?? []).map((vehicle) => {
    const media = [...vehicle.vehicle_media].sort((a, b) => a.sort_order - b.sort_order);
    return {
      id: vehicle.id,
      title: vehicle.title,
      make: vehicle.make,
      model: vehicle.model,
      variant: vehicle.variant,
      year: vehicle.year,
      price: vehicle.price,
      mileage: vehicle.mileage,
      fuelType: vehicle.fuel_type,
      transmission: vehicle.transmission,
      bodyType: vehicle.body_type,
      color: vehicle.color,
      description: vehicle.description,
      status: vehicle.status,
      photos: media.map((m) => ({
        id: m.id,
        isPrimary: m.is_primary,
        url: supabase.storage.from("vehicle-media").getPublicUrl(m.storage_path).data.publicUrl,
      })),
    };
  });

  return (
    <div className="p-7">
      <VehicleList vehicles={items} bodyTypeOptions={(vehicleTypes ?? []).map((t) => t.name)} />
    </div>
  );
}
