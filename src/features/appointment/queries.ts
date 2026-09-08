import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface AppointmentListItem {
  id: string;
  bookingReference: string;
  status: "PENDING" | "CONFIRMED" | "RESCHEDULED" | "DECLINED" | "CANCELLED" | "COMPLETED";
  createdAt: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  customerNotes: string | null;
  showroomNotes: string | null;
  showroomId: string;
  showroomName: string;
  vehicles: { id: string; title: string }[];
}

const APPOINTMENT_SELECT_COLUMNS =
  "id, booking_reference, status, created_at, appointment_date, start_time, end_time, contact_name, contact_email, contact_phone, customer_notes, showroom_notes, showroom_id, showrooms(business_name), appointment_vehicles(vehicles(id, make, model))";

interface AppointmentRow {
  id: string;
  booking_reference: string;
  status: AppointmentListItem["status"];
  created_at: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  customer_notes: string | null;
  showroom_notes: string | null;
  showroom_id: string;
  showrooms: { business_name: string } | null;
  appointment_vehicles: { vehicles: { id: string; make: string; model: string } | null }[] | null;
}

function rowToListItem(row: AppointmentRow): AppointmentListItem {
  return {
    id: row.id,
    bookingReference: row.booking_reference,
    status: row.status,
    createdAt: row.created_at,
    appointmentDate: row.appointment_date,
    startTime: row.start_time,
    endTime: row.end_time,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    customerNotes: row.customer_notes,
    showroomNotes: row.showroom_notes,
    showroomId: row.showroom_id,
    showroomName: row.showrooms?.business_name ?? "Unknown showroom",
    vehicles: (row.appointment_vehicles ?? [])
      .map((av) => av.vehicles)
      .filter((v): v is { id: string; make: string; model: string } => v != null)
      .map((v) => ({ id: v.id, title: `${v.make} ${v.model}` })),
  };
}

/** Every appointment, platform-wide — admin panel only (RLS also allows it). */
export async function getAllAppointments(supabase: SupabaseServerClient): Promise<AppointmentListItem[]> {
  const { data } = await supabase.from("appointments").select(APPOINTMENT_SELECT_COLUMNS).order("created_at", { ascending: false });
  return ((data as AppointmentRow[] | null) ?? []).map(rowToListItem);
}

/** One showroom's own appointments — dashboard panel. */
export async function getShowroomAppointments(supabase: SupabaseServerClient, showroomId: string): Promise<AppointmentListItem[]> {
  const { data } = await supabase
    .from("appointments")
    .select(APPOINTMENT_SELECT_COLUMNS)
    .eq("showroom_id", showroomId)
    .order("created_at", { ascending: false });
  return ((data as AppointmentRow[] | null) ?? []).map(rowToListItem);
}

export async function getPendingAppointmentCount(supabase: SupabaseServerClient, showroomId?: string): Promise<number> {
  let query = supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "PENDING");
  if (showroomId) query = query.eq("showroom_id", showroomId);
  const { count } = await query;
  return count ?? 0;
}

export interface AvailabilityWindow {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

/** A showroom's weekly working-hours windows — public (a visitor needs it to build the slot picker). */
export async function getShowroomAvailability(supabase: SupabaseServerClient, showroomId: string): Promise<AvailabilityWindow[]> {
  const { data } = await supabase
    .from("showroom_availability")
    .select("id, day_of_week, start_time, end_time, is_available")
    .eq("showroom_id", showroomId)
    .order("day_of_week", { ascending: true });
  return (data ?? []).map((row) => ({
    id: row.id,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    endTime: row.end_time,
    isAvailable: row.is_available,
  }));
}

export interface ShowroomSlotConfig {
  slotDurationMinutes: number;
  bufferMinutes: number;
}

export async function getShowroomSlotConfig(supabase: SupabaseServerClient, showroomId: string): Promise<ShowroomSlotConfig | null> {
  const { data } = await supabase.from("showrooms").select("slot_duration_minutes, buffer_minutes").eq("id", showroomId).maybeSingle();
  if (!data) return null;
  return { slotDurationMinutes: data.slot_duration_minutes, bufferMinutes: data.buffer_minutes };
}
