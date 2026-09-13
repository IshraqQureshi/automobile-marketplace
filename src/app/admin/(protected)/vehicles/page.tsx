import type { Metadata } from "next";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { VehicleModerationList } from "@/components/admin/vehicle-moderation-list";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { VEHICLE_SELECT_COLUMNS, vehicleRowToListItem, type VehicleWithShowroom } from "@/features/vehicle/types";

export const metadata: Metadata = {
  title: "Vehicles — HarakaGari Admin",
};

// Platform-wide, every status — is_admin() is OR'd into vehicles' SELECT RLS
// policy (vehicles_select_public_or_owner_or_admin), so this plain RLS-scoped
// client already returns every vehicle regardless of status or owning
// showroom for an authenticated admin; no service-role client needed (same
// reasoning as the admin dashboard's own count queries).
export default async function AdminVehiclesPage() {
  const supabase = await createClient();

  const [{ data: vehicles, error }, { data: commissionRows }] = await Promise.all([
    supabase.from("vehicles").select(`${VEHICLE_SELECT_COLUMNS}, showroom_id, showrooms(business_name)`).order("created_at", { ascending: false }),
    // Admin-only table (RLS) — a non-admin caller would just get an empty
    // array back, not an error, so no separate guard needed here.
    supabase.from("vehicle_commissions").select("vehicle_id, amount, status, notes"),
  ]);

  if (error) {
    logger.error("Admin vehicles: failed to load listings", error);
  }

  const commissionByVehicleId = new Map((commissionRows ?? []).map((row) => [row.vehicle_id, row]));

  const getPhotoUrl = (storagePath: string) => supabase.storage.from("vehicle-media").getPublicUrl(storagePath).data.publicUrl;
  const items: VehicleWithShowroom[] = (vehicles ?? []).map((vehicle) => ({
    ...vehicleRowToListItem(vehicle, getPhotoUrl),
    showroomId: vehicle.showroom_id,
    showroomName: vehicle.showrooms?.business_name ?? "Unknown showroom",
  }));
  const commissions: Record<string, { amount: number; status: "PENDING" | "PAID"; notes: string | null }> = {};
  for (const item of items) {
    const row = commissionByVehicleId.get(item.id);
    if (row) commissions[item.id] = { amount: row.amount, status: row.status, notes: row.notes };
  }

  return (
    <>
      <AdminTopbar title="Vehicles" />
      <main className="flex-1 px-7 py-6">
        <VehicleModerationList vehicles={items} commissions={commissions} />
      </main>
    </>
  );
}
