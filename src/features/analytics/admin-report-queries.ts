import { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";
import { countsByDate, countsByGroup, topByValue, type GroupCount, type RankedItem, type TimeSeriesPoint } from "./aggregations";
import type { BucketGranularity, DateRange } from "./date-range";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface ShowroomScorecardRow {
  showroomId: string;
  showroomName: string;
  status: string;
  vehicleCount: number;
  uniqueViews: number;
  inquiries: number;
  appointments: number;
  financingApplications: number;
  totalEngagement: number;
}

export interface AdminReportData {
  showroomStatusBreakdown: GroupCount[];
  showroomSignupsOverTime: TimeSeriesPoint[];
  appointmentsOverTime: TimeSeriesPoint[];
  inquiriesOverTime: TimeSeriesPoint[];
  financingOverTime: TimeSeriesPoint[];
  userSignupsOverTime: TimeSeriesPoint[];
  topVehicles: RankedItem[];
  topShowrooms: RankedItem[]; // by totalEngagement, for the bar chart
  showroomScorecards: ShowroomScorecardRow[]; // the full per-showroom breakdown table ("how is each showroom working")
  subscriptionRevenue: { total: number; currency: string };
}

/**
 * Every number on the super-admin Reports page, platform-wide for the
 * given date range. Unlike the showroom-owner report, "showroom signups"
 * and the scorecard table are NOT date-filtered on their own row counts
 * (a showroom's vehicle count/status is a current snapshot, not something
 * that happened "in" a date range) — only the time-series charts and the
 * per-showroom activity counts (inquiries/appointments/financing/views)
 * are scoped to the selected range.
 */
export async function getAdminReportData(supabase: SupabaseServerClient, range: DateRange, granularity: BucketGranularity): Promise<AdminReportData> {
  const rangeStartIso = `${range.start}T00:00:00`;
  const rangeEndIso = `${range.end}T23:59:59.999`;

  const [showroomsRes, profilesRes, appointmentsRes, inquiriesRes, financingRes, vehiclesRes, paymentsRes] = await Promise.all([
    supabase.from("showrooms").select("id, business_name, status, created_at"),
    supabase.from("profiles").select("id, created_at"),
    supabase.from("appointments").select("id, created_at, showroom_id").gte("created_at", rangeStartIso).lte("created_at", rangeEndIso),
    supabase.from("vehicle_inquiries").select("id, created_at, showroom_id").gte("created_at", rangeStartIso).lte("created_at", rangeEndIso),
    supabase.from("financing_applications").select("id, created_at, showroom_id").gte("created_at", rangeStartIso).lte("created_at", rangeEndIso),
    supabase.from("vehicles").select("id, make, model, showroom_id, status"),
    supabase
      .from("manual_payments")
      .select("amount, currency")
      .not("showroom_id", "is", null)
      .eq("status", "RECORDED")
      .gte("created_at", rangeStartIso)
      .lte("created_at", rangeEndIso),
  ]);

  const showrooms = showroomsRes.data ?? [];
  const profiles = profilesRes.data ?? [];
  const appointmentRows = appointmentsRes.data ?? [];
  const inquiryRows = inquiriesRes.data ?? [];
  const financingRows = financingRes.data ?? [];
  const vehicles = vehiclesRes.data ?? [];
  const payments = paymentsRes.data ?? [];

  // vehicle_views has NO client-facing SELECT policy at all, by deliberate
  // design (only record_vehicle_view(), a security-definer function,
  // touches this table) — confirmed by reading that table's own migration
  // before writing this query, since the RLS-scoped client would
  // otherwise silently return zero rows here instead of erroring. Safe to
  // use the service-role client for this specific aggregate lookup: it
  // only ever returns a per-vehicle count, never the raw viewer_key rows
  // that could identify a viewer.
  const activeVehicleIds = vehicles.filter((v) => v.status === "ACTIVE").map((v) => v.id);
  const admin = createAdminClient();
  const { data: viewRows } =
    activeVehicleIds.length > 0
      ? await admin.from("vehicle_views").select("vehicle_id").in("vehicle_id", activeVehicleIds).gte("created_at", rangeStartIso).lte("created_at", rangeEndIso)
      : { data: [] };
  const viewsByVehicle = new Map<string, number>();
  for (const row of viewRows ?? []) viewsByVehicle.set(row.vehicle_id, (viewsByVehicle.get(row.vehicle_id) ?? 0) + 1);

  const showroomStatusBreakdown = countsByGroup(showrooms, (s) => s.status);
  const showroomSignupsOverTime = countsByDate(showrooms, (s) => s.created_at.slice(0, 10), range, granularity);
  const userSignupsOverTime = countsByDate(profiles, (p) => p.created_at.slice(0, 10), range, granularity);
  const appointmentsOverTime = countsByDate(appointmentRows, (r) => r.created_at.slice(0, 10), range, granularity);
  const inquiriesOverTime = countsByDate(inquiryRows, (r) => r.created_at.slice(0, 10), range, granularity);
  const financingOverTime = countsByDate(financingRows, (r) => r.created_at.slice(0, 10), range, granularity);

  const topVehicles = topByValue(
    vehicles.filter((v) => v.status === "ACTIVE").map((v) => ({ key: v.id, label: `${v.make} ${v.model}`, value: viewsByVehicle.get(v.id) ?? 0 })),
    10,
  ).filter((v) => v.value > 0);

  const vehicleCountByShowroom = new Map<string, number>();
  const viewsByShowroom = new Map<string, number>();
  for (const v of vehicles) {
    if (v.status === "ACTIVE") vehicleCountByShowroom.set(v.showroom_id, (vehicleCountByShowroom.get(v.showroom_id) ?? 0) + 1);
    const views = viewsByVehicle.get(v.id) ?? 0;
    if (views > 0) viewsByShowroom.set(v.showroom_id, (viewsByShowroom.get(v.showroom_id) ?? 0) + views);
  }
  const inquiriesByShowroom = countsByGroup(inquiryRows, (r) => r.showroom_id);
  const appointmentsByShowroom = countsByGroup(appointmentRows, (r) => r.showroom_id);
  const financingByShowroom = countsByGroup(financingRows, (r) => r.showroom_id);
  const toMap = (groups: GroupCount[]) => new Map(groups.map((g) => [g.group, g.count]));
  const inquiriesByShowroomMap = toMap(inquiriesByShowroom);
  const appointmentsByShowroomMap = toMap(appointmentsByShowroom);
  const financingByShowroomMap = toMap(financingByShowroom);

  const showroomScorecards: ShowroomScorecardRow[] = showrooms.map((s) => {
    const inquiries = inquiriesByShowroomMap.get(s.id) ?? 0;
    const appointments = appointmentsByShowroomMap.get(s.id) ?? 0;
    const financingApplications = financingByShowroomMap.get(s.id) ?? 0;
    const uniqueViews = viewsByShowroom.get(s.id) ?? 0;
    return {
      showroomId: s.id,
      showroomName: s.business_name,
      status: s.status,
      vehicleCount: vehicleCountByShowroom.get(s.id) ?? 0,
      uniqueViews,
      inquiries,
      appointments,
      financingApplications,
      totalEngagement: uniqueViews + inquiries + appointments + financingApplications,
    };
  });
  showroomScorecards.sort((a, b) => b.totalEngagement - a.totalEngagement);

  const topShowrooms = topByValue(
    showroomScorecards.map((s) => ({ key: s.showroomId, label: s.showroomName, value: s.totalEngagement })),
    10,
  ).filter((s) => s.value > 0);

  const currency = payments[0]?.currency ?? "KES";
  const subscriptionRevenue = { total: payments.reduce((sum, p) => sum + Number(p.amount), 0), currency };

  return {
    showroomStatusBreakdown,
    showroomSignupsOverTime,
    appointmentsOverTime,
    inquiriesOverTime,
    financingOverTime,
    userSignupsOverTime,
    topVehicles,
    topShowrooms,
    showroomScorecards,
    subscriptionRevenue,
  };
}
