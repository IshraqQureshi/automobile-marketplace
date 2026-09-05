import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { VehicleList } from "@/components/dashboard/vehicle-list";
import { requireApprovedOwnerShowroom } from "@/features/showroom/my-showroom";
import type { VehicleListItem } from "@/features/vehicle/types";
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
    .select(
      "id, title, make, model, variant, year, price, mileage, fuel_type, transmission, body_type, color, description, engine, interior, doors, seats, country_of_origin, installment_enabled, bank_finance_enabled, financing_down_payment_type, financing_down_payment_percent, financing_down_payment_amount, financing_interest_rate, financing_insurance_percent, financing_partner, financing_tenure_options_months, financing_tracker_options, status, vehicle_media(id, storage_path, is_primary, sort_order)",
    )
    .eq("showroom_id", showroom.id)
    .order("created_at", { ascending: false });

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
      photos: media.map((m) => ({
        id: m.id,
        isPrimary: m.is_primary,
        url: supabase.storage.from("vehicle-media").getPublicUrl(m.storage_path).data.publicUrl,
      })),
    };
  });

  return (
    <div className="p-7">
      <VehicleList vehicles={items} />
    </div>
  );
}
