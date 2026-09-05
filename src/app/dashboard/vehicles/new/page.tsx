import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { VehicleForm } from "@/components/dashboard/vehicle-form";
import { requireApprovedOwnerShowroom } from "@/features/showroom/my-showroom";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "New vehicle — HarakaGari",
};

export default async function NewVehiclePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await requireApprovedOwnerShowroom(user.id);

  const [{ data: brands }, { data: models }, { data: vehicleTypes }] = await Promise.all([
    supabase.from("brands").select("id, name").order("name"),
    supabase.from("models").select("id, name, brand_id").order("name"),
    supabase.from("vehicle_types").select("name").order("name"),
  ]);

  return (
    <div className="mx-auto max-w-3xl p-7">
      <Link href="/dashboard/vehicles" className="text-sm font-medium text-neutral-500 hover:text-neutral-700">
        ← Back to vehicles
      </Link>
      <h1 className="mt-2 mb-6 font-display text-xl font-semibold text-neutral-900">New vehicle</h1>
      <VehicleForm
        mode="create"
        brands={brands ?? []}
        models={(models ?? []).map((m) => ({ id: m.id, name: m.name, brandId: m.brand_id }))}
        bodyTypeOptions={(vehicleTypes ?? []).map((t) => t.name)}
      />
    </div>
  );
}
