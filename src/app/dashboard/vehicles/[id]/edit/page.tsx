import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { VehicleForm } from "@/components/dashboard/vehicle-form";
import { VehiclePhotosSection } from "@/components/dashboard/vehicle-photos-section";
import { requireApprovedOwnerShowroom } from "@/features/showroom/my-showroom";
import type { VehicleListItem } from "@/features/vehicle/types";
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
    supabase
      .from("vehicles")
      .select(
        "id, title, make, model, variant, year, price, mileage, fuel_type, transmission, body_type, color, description, engine, interior, doors, seats, country_of_origin, installment_enabled, bank_finance_enabled, financing_down_payment_type, financing_down_payment_percent, financing_down_payment_amount, financing_interest_rate, financing_insurance_percent, financing_partner, financing_tenure_options_months, financing_tracker_options, status, vehicle_media(id, storage_path, is_primary, sort_order)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("brands").select("id, name").order("name"),
    supabase.from("models").select("id, name, brand_id").order("name"),
    supabase.from("vehicle_types").select("name").order("name"),
  ]);

  // RLS-scoped select — this returns null both when the vehicle doesn't
  // exist and when it belongs to another showroom (silently filtered), so
  // either case is a plain 404, never a distinguishable error that would
  // leak whether some other owner's vehicle id exists.
  if (!vehicle) notFound();

  const media = [...vehicle.vehicle_media].sort((a, b) => a.sort_order - b.sort_order);
  const photos = media.map((m) => ({
    id: m.id,
    isPrimary: m.is_primary,
    url: supabase.storage.from("vehicle-media").getPublicUrl(m.storage_path).data.publicUrl,
  }));

  const item: VehicleListItem = {
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
    engine: vehicle.engine,
    interior: vehicle.interior,
    doors: vehicle.doors,
    seats: vehicle.seats,
    countryOfOrigin: vehicle.country_of_origin,
    installmentEnabled: vehicle.installment_enabled,
    bankFinanceEnabled: vehicle.bank_finance_enabled,
    financingDownPaymentType: vehicle.financing_down_payment_type as "PERCENT" | "FIXED",
    financingDownPaymentPercent: vehicle.financing_down_payment_percent,
    financingDownPaymentAmount: vehicle.financing_down_payment_amount,
    financingInterestRate: vehicle.financing_interest_rate,
    financingInsurancePercent: vehicle.financing_insurance_percent,
    financingPartner: vehicle.financing_partner,
    financingTenureMonths: vehicle.financing_tenure_options_months,
    financingTrackerOptions: vehicle.financing_tracker_options as { duration: string; price: number }[] | null,
    status: vehicle.status,
    photos,
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-7">
      <div>
        <Link href="/dashboard/vehicles" className="text-sm font-medium text-neutral-500 hover:text-neutral-700">
          ← Back to vehicles
        </Link>
        <h1 className="mt-2 font-display text-xl font-semibold text-neutral-900">{vehicle.title}</h1>
      </div>

      <VehiclePhotosSection vehicleId={vehicle.id} photos={photos} />

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
