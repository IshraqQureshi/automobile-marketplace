import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface FinancingApplicationListItem {
  id: string;
  status: "NEW" | "VIEWED";
  createdAt: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  employmentStatus: string;
  monthlyIncome: number;
  nationalId: string;
  desiredDownPayment: number;
  desiredTenureMonths: number;
  notes: string | null;
  vehicleId: string;
  vehicleTitle: string;
  showroomName: string;
}

const FINANCING_APPLICATION_SELECT_COLUMNS =
  "id, status, created_at, contact_name, contact_email, contact_phone, employment_status, monthly_income, national_id, desired_down_payment, desired_tenure_months, notes, vehicle_id, vehicles(make, model), showroom_id, showrooms(business_name)";

interface FinancingApplicationRow {
  id: string;
  status: "NEW" | "VIEWED";
  created_at: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  employment_status: string;
  monthly_income: number;
  national_id: string;
  desired_down_payment: number;
  desired_tenure_months: number;
  notes: string | null;
  vehicle_id: string;
  vehicles: { make: string; model: string } | null;
  showroom_id: string;
  showrooms: { business_name: string } | null;
}

function rowToListItem(row: FinancingApplicationRow): FinancingApplicationListItem {
  return {
    id: row.id,
    status: row.status,
    createdAt: row.created_at,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    employmentStatus: row.employment_status,
    monthlyIncome: row.monthly_income,
    nationalId: row.national_id,
    desiredDownPayment: row.desired_down_payment,
    desiredTenureMonths: row.desired_tenure_months,
    notes: row.notes,
    vehicleId: row.vehicle_id,
    vehicleTitle: row.vehicles ? `${row.vehicles.make} ${row.vehicles.model}` : "Unknown vehicle",
    showroomName: row.showrooms?.business_name ?? "Unknown showroom",
  };
}

/** Every financing application, platform-wide — admin panel only (RLS also allows it). */
export async function getAllFinancingApplications(supabase: SupabaseServerClient): Promise<FinancingApplicationListItem[]> {
  const { data } = await supabase
    .from("financing_applications")
    .select(FINANCING_APPLICATION_SELECT_COLUMNS)
    .order("created_at", { ascending: false });
  return ((data as FinancingApplicationRow[] | null) ?? []).map(rowToListItem);
}

/** One showroom's own financing applications — dashboard panel. */
export async function getShowroomFinancingApplications(supabase: SupabaseServerClient, showroomId: string): Promise<FinancingApplicationListItem[]> {
  const { data } = await supabase
    .from("financing_applications")
    .select(FINANCING_APPLICATION_SELECT_COLUMNS)
    .eq("showroom_id", showroomId)
    .order("created_at", { ascending: false });
  return ((data as FinancingApplicationRow[] | null) ?? []).map(rowToListItem);
}

export async function getUnreadFinancingCount(supabase: SupabaseServerClient, showroomId?: string): Promise<number> {
  let query = supabase.from("financing_applications").select("id", { count: "exact", head: true }).eq("status", "NEW");
  if (showroomId) query = query.eq("showroom_id", showroomId);
  const { count } = await query;
  return count ?? 0;
}
