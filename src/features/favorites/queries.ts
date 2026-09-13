import type { createClient } from "@/lib/supabase/server";
import { VEHICLE_SELECT_COLUMNS, vehicleRowToListItem, type VehicleWithShowroom } from "@/features/vehicle/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

interface FavoriteVehicleRow {
  vehicle_id: string;
  vehicles: (Parameters<typeof vehicleRowToListItem>[0] & { showroom_id: string; showrooms: { business_name: string } | null }) | null;
}

/** A customer's own favorited vehicles, most recently favorited first — customer dashboard (AUTH-004/AUTH-005). */
export async function getCustomerFavorites(supabase: SupabaseServerClient, customerId: string): Promise<VehicleWithShowroom[]> {
  const { data } = await supabase
    .from("favorites")
    .select(`vehicle_id, vehicles(${VEHICLE_SELECT_COLUMNS}, showroom_id, showrooms(business_name))`)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  const getPhotoUrl = (storagePath: string) => supabase.storage.from("vehicle-media").getPublicUrl(storagePath).data.publicUrl;

  return ((data as FavoriteVehicleRow[] | null) ?? [])
    .map((row) => row.vehicles)
    .filter((v): v is NonNullable<FavoriteVehicleRow["vehicles"]> => v != null)
    .map((v) => ({
      ...vehicleRowToListItem(v, getPhotoUrl),
      showroomId: v.showroom_id,
      showroomName: v.showrooms?.business_name ?? "Unknown showroom",
    }));
}

/** Every vehicle id a customer has favorited — used to render an already-favorited heart state on other pages (e.g. a vehicle's own detail page). */
export async function getFavoritedVehicleIds(supabase: SupabaseServerClient, customerId: string): Promise<Set<string>> {
  const { data } = await supabase.from("favorites").select("vehicle_id").eq("customer_id", customerId);
  return new Set((data ?? []).map((row) => row.vehicle_id));
}
