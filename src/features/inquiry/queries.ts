import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface InquiryListItem {
  id: string;
  status: "NEW" | "VIEWED";
  createdAt: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  message: string;
  vehicleId: string;
  vehicleTitle: string;
  showroomName: string;
}

const INQUIRY_SELECT_COLUMNS =
  "id, status, created_at, contact_name, contact_email, contact_phone, message, vehicle_id, vehicles(make, model), showroom_id, showrooms(business_name)";

interface InquiryRow {
  id: string;
  status: "NEW" | "VIEWED";
  created_at: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  message: string;
  vehicle_id: string;
  vehicles: { make: string; model: string } | null;
  showroom_id: string;
  showrooms: { business_name: string } | null;
}

function rowToListItem(row: InquiryRow): InquiryListItem {
  return {
    id: row.id,
    status: row.status,
    createdAt: row.created_at,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    message: row.message,
    vehicleId: row.vehicle_id,
    vehicleTitle: row.vehicles ? `${row.vehicles.make} ${row.vehicles.model}` : "Unknown vehicle",
    showroomName: row.showrooms?.business_name ?? "Unknown showroom",
  };
}

/** Every inquiry, platform-wide — admin panel only (RLS also allows it). */
export async function getAllInquiries(supabase: SupabaseServerClient): Promise<InquiryListItem[]> {
  const { data } = await supabase.from("vehicle_inquiries").select(INQUIRY_SELECT_COLUMNS).order("created_at", { ascending: false });
  return ((data as InquiryRow[] | null) ?? []).map(rowToListItem);
}

/** One showroom's own inquiries — dashboard panel. */
export async function getShowroomInquiries(supabase: SupabaseServerClient, showroomId: string): Promise<InquiryListItem[]> {
  const { data } = await supabase
    .from("vehicle_inquiries")
    .select(INQUIRY_SELECT_COLUMNS)
    .eq("showroom_id", showroomId)
    .order("created_at", { ascending: false });
  return ((data as InquiryRow[] | null) ?? []).map(rowToListItem);
}

export async function getUnreadInquiryCount(supabase: SupabaseServerClient, showroomId?: string): Promise<number> {
  let query = supabase.from("vehicle_inquiries").select("id", { count: "exact", head: true }).eq("status", "NEW");
  if (showroomId) query = query.eq("showroom_id", showroomId);
  const { count } = await query;
  return count ?? 0;
}
