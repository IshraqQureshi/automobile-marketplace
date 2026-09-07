import { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";
import { countsByDate, countsByGroup, findReturningCustomerIds, topByValue, type GroupCount, type RankedItem, type TimeSeriesPoint } from "./aggregations";
import type { BucketGranularity, DateRange } from "./date-range";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface ReportRow {
  id: string;
  createdAt: string;
  status: string;
  contactName: string;
  contactEmail: string;
  vehicleTitles: string;
}

export interface ReturningCustomer {
  customerId: string;
  name: string;
  email: string;
  interactionCount: number;
}

export interface ShowroomReportData {
  appointments: { total: number; overTime: TimeSeriesPoint[]; byStatus: GroupCount[]; rows: ReportRow[] };
  inquiries: { total: number; overTime: TimeSeriesPoint[]; byStatus: GroupCount[]; rows: ReportRow[] };
  financing: { total: number; overTime: TimeSeriesPoint[]; byStatus: GroupCount[]; rows: ReportRow[] };
  topVehicles: RankedItem[];
  vehicleStatusBreakdown: GroupCount[];
  returningCustomers: { count: number; rows: ReturningCustomer[] };
}

function vehicleTitle(v: { make: string; model: string } | null): string {
  return v ? `${v.make} ${v.model}` : "Unknown vehicle";
}

/**
 * Every number on the showroom-owner Reports page, for one showroom and
 * date range. Each source table only has `created_at` (no separate
 * "updated"/"responded at" timestamp on inquiries/financing — see
 * queries.ts elsewhere), so "over time" always means "when the
 * request/appointment/application was submitted," not when it was later
 * actioned.
 */
export async function getShowroomReportData(
  supabase: SupabaseServerClient,
  showroomId: string,
  range: DateRange,
  granularity: BucketGranularity,
): Promise<ShowroomReportData> {
  const rangeStartIso = `${range.start}T00:00:00`;
  const rangeEndIso = `${range.end}T23:59:59.999`;

  const [appointmentsRes, inquiriesRes, financingRes, showroomVehiclesRes] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, created_at, status, customer_id, contact_name, contact_email, appointment_vehicles(vehicles(make, model))")
      .eq("showroom_id", showroomId)
      .gte("created_at", rangeStartIso)
      .lte("created_at", rangeEndIso),
    supabase
      .from("vehicle_inquiries")
      .select("id, created_at, status, customer_id, contact_name, contact_email, vehicles(make, model)")
      .eq("showroom_id", showroomId)
      .gte("created_at", rangeStartIso)
      .lte("created_at", rangeEndIso),
    supabase
      .from("financing_applications")
      .select("id, created_at, status, customer_id, contact_name, contact_email, vehicles(make, model)")
      .eq("showroom_id", showroomId)
      .gte("created_at", rangeStartIso)
      .lte("created_at", rangeEndIso),
    supabase.from("vehicles").select("id, make, model, status").eq("showroom_id", showroomId),
  ]);

  const appointmentRows = appointmentsRes.data ?? [];
  const inquiryRows = inquiriesRes.data ?? [];
  const financingRows = financingRes.data ?? [];
  const showroomVehicles = showroomVehiclesRes.data ?? [];

  const appointments = {
    total: appointmentRows.length,
    overTime: countsByDate(appointmentRows, (r) => r.created_at.slice(0, 10), range, granularity),
    byStatus: countsByGroup(appointmentRows, (r) => r.status),
    rows: appointmentRows.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      status: r.status,
      contactName: r.contact_name,
      contactEmail: r.contact_email,
      vehicleTitles: (r.appointment_vehicles ?? []).map((av) => vehicleTitle(av.vehicles)).join("; ") || "—",
    })),
  };

  const inquiries = {
    total: inquiryRows.length,
    overTime: countsByDate(inquiryRows, (r) => r.created_at.slice(0, 10), range, granularity),
    byStatus: countsByGroup(inquiryRows, (r) => r.status),
    rows: inquiryRows.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      status: r.status,
      contactName: r.contact_name,
      contactEmail: r.contact_email,
      vehicleTitles: vehicleTitle(r.vehicles),
    })),
  };

  const financing = {
    total: financingRows.length,
    overTime: countsByDate(financingRows, (r) => r.created_at.slice(0, 10), range, granularity),
    byStatus: countsByGroup(financingRows, (r) => r.status),
    rows: financingRows.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      status: r.status,
      contactName: r.contact_name,
      contactEmail: r.contact_email,
      vehicleTitles: vehicleTitle(r.vehicles),
    })),
  };

  // "Top viewed cars" — unique-viewer view counts within the range.
  // vehicle_views has NO client-facing SELECT policy at all, by deliberate
  // design (its own migration comment: "only record_vehicle_view()
  // (security definer) touches this table") — the RLS-scoped client would
  // silently return zero rows to every caller, admin and showroom owner
  // alike, confirmed by reading that policy before writing this query
  // (the same "silently blind, not an error" RLS gotcha this codebase has
  // hit before for other tables). Using the service-role client here is
  // safe: this only ever returns an aggregate count per vehicle_id, never
  // the raw viewer_key rows (which could reveal a logged-in customer's
  // identity or an anonymous visitor's hashed IP) to the browser.
  // record_vehicle_view() only ever inserts one row per (vehicle, viewer)
  // ever, so a viewer's repeat visits don't add more rows — this counts
  // unique viewers who first viewed within the range, not raw page loads.
  const vehicleIds = showroomVehicles.map((v) => v.id);
  const admin = createAdminClient();
  const { data: viewRows } =
    vehicleIds.length > 0
      ? await admin.from("vehicle_views").select("vehicle_id").in("vehicle_id", vehicleIds).gte("created_at", rangeStartIso).lte("created_at", rangeEndIso)
      : { data: [] };
  const viewCounts = new Map<string, number>();
  for (const row of viewRows ?? []) viewCounts.set(row.vehicle_id, (viewCounts.get(row.vehicle_id) ?? 0) + 1);
  const topVehicles = topByValue(
    showroomVehicles.map((v) => ({ key: v.id, label: `${v.make} ${v.model}`, value: viewCounts.get(v.id) ?? 0 })),
    10,
  ).filter((v) => v.value > 0);

  const vehicleStatusBreakdown = countsByGroup(showroomVehicles, (v) => v.status);

  // Returning customers — a logged-in customer submitting more than one
  // appointment/inquiry/financing application to THIS showroom within the
  // range. Guest (customer_id null) submissions can't be identity-matched
  // (see aggregations.ts's own docs) so they're excluded here, not
  // approximated by email/phone text matching.
  type IdentifiedRow = { customer_id: string | null; contact_name: string; contact_email: string };
  const allIdentifiableRows: IdentifiedRow[] = [...appointmentRows, ...inquiryRows, ...financingRows];
  const returningIds = findReturningCustomerIds(allIdentifiableRows.map((r) => r.customer_id));
  const returningDetails = new Map<string, ReturningCustomer>();
  for (const row of allIdentifiableRows) {
    if (!row.customer_id || !returningIds.has(row.customer_id)) continue;
    const existing = returningDetails.get(row.customer_id);
    returningDetails.set(row.customer_id, {
      customerId: row.customer_id,
      name: row.contact_name,
      email: row.contact_email,
      interactionCount: (existing?.interactionCount ?? 0) + 1,
    });
  }

  return {
    appointments,
    inquiries,
    financing,
    topVehicles,
    vehicleStatusBreakdown,
    returningCustomers: { count: returningDetails.size, rows: [...returningDetails.values()].sort((a, b) => b.interactionCount - a.interactionCount) },
  };
}
