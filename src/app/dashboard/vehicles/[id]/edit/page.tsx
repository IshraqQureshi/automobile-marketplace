import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { VehicleForm } from "@/components/dashboard/vehicle-form";
import { VehiclePhotosSection } from "@/components/dashboard/vehicle-photos-section";
import { requireApprovedOwnerShowroom } from "@/features/showroom/my-showroom";
import { VEHICLE_SELECT_COLUMNS, vehicleRowToListItem } from "@/features/vehicle/types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Edit vehicle — HarakaGari",
};

interface EditVehiclePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditVehiclePage({ params }: EditVehiclePageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await requireApprovedOwnerShowroom(user.id);

  const [{ data: vehicle }, { data: brands }, { data: models }, { data: vehicleTypes }] = await Promise.all([
    supabase.from("vehicles").select(VEHICLE_SELECT_COLUMNS).eq("id", id).maybeSingle(),
    supabase.from("brands").select("id, name").order("name"),
    supabase.from("models").select("id, name, brand_id").order("name"),
    supabase.from("vehicle_types").select("name").order("name"),
  ]);

  // RLS-scoped select — this returns null both when the vehicle doesn't
  // exist and when it belongs to another showroom (silently filtered), so
  // either case is a plain 404, never a distinguishable error that would
  // leak whether some other owner's vehicle id exists.
  if (!vehicle) notFound();

  const item = vehicleRowToListItem(vehicle, (storagePath) => supabase.storage.from("vehicle-media").getPublicUrl(storagePath).data.publicUrl);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-7">
      <div>
        <Link href="/dashboard/vehicles" className="text-sm font-medium text-neutral-500 hover:text-neutral-700">
          ← Back to vehicles
        </Link>
        <h1 className="mt-2 font-display text-xl font-semibold text-neutral-900">{vehicle.title}</h1>
      </div>

      <VehiclePhotosSection vehicleId={vehicle.id} photos={item.photos} />

      <VehicleForm
        mode="edit"
        vehicleId={vehicle.id}
        initialValues={item}
        brands={brands ?? []}
        models={(models ?? []).map((m) => ({ id: m.id, name: m.name, brandId: m.brand_id }))}
        bodyTypeOptions={(vehicleTypes ?? []).map((t) => t.name)}
      />
    </div>
  );
}
