import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface SoldVehicleCommissionRow {
  vehicleId: string;
  vehicleTitle: string;
  showroomName: string;
  commission: { amount: number; status: "PENDING" | "PAID"; notes: string | null } | null;
}

/**
 * Every SOLD vehicle, platform-wide, with its commission record if one has
 * been recorded yet — the same data set the "Commission" column on
 * /admin/vehicles reads, reshaped here so the admin Payments page can offer
 * commission entry as its own dedicated list (not only reachable by first
 * finding the vehicle in the moderation list). A vehicle's commission
 * record is deliberately not deleted if its status is later reverted away
 * from SOLD (see 20260913010000_create_vehicle_commissions.sql), but this
 * query only ever surfaces *currently* SOLD vehicles, matching what an
 * admin actually needs to act on here.
 */
export async function getSoldVehicleCommissions(supabase: SupabaseServerClient): Promise<SoldVehicleCommissionRow[]> {
  const [{ data: vehicles }, { data: commissionRows }] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id, title, showrooms(business_name)")
      .eq("status", "SOLD")
      .order("updated_at", { ascending: false }),
    supabase.from("vehicle_commissions").select("vehicle_id, amount, status, notes"),
  ]);

  const commissionByVehicleId = new Map((commissionRows ?? []).map((c) => [c.vehicle_id, c]));

  return (vehicles ?? []).map((v) => {
    const commission = commissionByVehicleId.get(v.id);
    return {
      vehicleId: v.id,
      vehicleTitle: v.title,
      showroomName: v.showrooms?.business_name ?? "—",
      commission: commission ? { amount: commission.amount, status: commission.status, notes: commission.notes } : null,
    };
  });
}
