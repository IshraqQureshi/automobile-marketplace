import type { createClient } from "@/lib/supabase/server";
import { VEHICLE_SELECT_COLUMNS, vehicleRowToListItem, type VehicleWithShowroom } from "@/features/vehicle/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

interface FavoriteVehicleRow {
  vehicle_id: string;
  vehicles: (Parameters<typeof vehicleRowToListItem>[0] & { showroom_id: string; showrooms: { business_name: string } | null }) | null;
}

/**
 * A customer's own favorited vehicles, most recently favorited first —
 * customer dashboard (AUTH-004/AUTH-005). Filtered to ACTIVE the same way
 * every other vehicle-facing query in this codebase is (listing-query.ts,
 * the vehicle detail page's own getVehicle) — a vehicle a customer
 * favorited while ACTIVE that a showroom later marks SOLD/DRAFT/INACTIVE
 * shouldn't keep showing up as a live, purchasable listing (AUTH-005's own
 * "deleted/unavailable vehicles are handled safely" acceptance criterion).
 * A fully deleted vehicle is handled by the favorites table's own
 * `on delete cascade`, so no filtering is needed for that case.
 */
export async function getCustomerFavorites(supabase: SupabaseServerClient, customerId: string): Promise<VehicleWithShowroom[]> {
  const { data } = await supabase
    .from("favorites")
    .select(`vehicle_id, vehicles(${VEHICLE_SELECT_COLUMNS}, showroom_id, showrooms(business_name))`)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  const getPhotoUrl = (storagePath: string) => supabase.storage.from("vehicle-media").getPublicUrl(storagePath).data.publicUrl;

  return ((data as FavoriteVehicleRow[] | null) ?? [])
    .map((row) => row.vehicles)
    .filter((v): v is NonNullable<FavoriteVehicleRow["vehicles"]> => v != null && v.status === "ACTIVE")
    .map((v) => ({
      ...vehicleRowToListItem(v, getPhotoUrl),
      showroomId: v.showroom_id,
      showroomName: v.showrooms?.business_name ?? "Unknown showroom",
    }));
}
