import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RankedBarChart, StatusPieChart, TimeSeriesChart } from "@/components/analytics/charts";
import { DateRangeForm } from "@/components/analytics/date-range-form";
import { ExportCsvButton } from "@/components/analytics/export-csv-button";
import { ReportEmptyState, ReportSection } from "@/components/analytics/report-section";
import { StatCard } from "@/components/analytics/stat-card";
import { APPOINTMENT_STATUS_LABELS } from "@/features/appointment/schemas";
import { pickGranularity, resolveDateRange, type DateRangePreset } from "@/features/analytics/date-range";
import { getShowroomReportData } from "@/features/analytics/showroom-report-queries";
import { requireApprovedOwnerShowroom } from "@/features/showroom/my-showroom";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Reports — HarakaGari",
};

interface DashboardReportsPageProps {
  searchParams: Promise<{ range?: string; start?: string; end?: string }>;
}

const VALID_PRESETS = new Set(["7d", "30d", "90d", "custom"]);

function isPreset(value: string | undefined): value is DateRangePreset {
  return !!value && VALID_PRESETS.has(value);
}

export default async function DashboardReportsPage({ searchParams }: DashboardReportsPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const showroom = await requireApprovedOwnerShowroom(user.id);

  const preset: DateRangePreset = isPreset(params.range) ? params.range : "30d";
  const range = resolveDateRange(preset, { start: params.start, end: params.end });
  const granularity = pickGranularity(range);

  const data = await getShowroomReportData(supabase, showroom.id, range, granularity);

  return (
    <div className="flex flex-col gap-6 p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-lg font-semibold text-neutral-900">Reports</h1>
          <p className="text-xs text-neutral-500">Showroom performance for {range.start} to {range.end}</p>
        </div>
        <DateRangeForm action="/dashboard/reports" preset={preset} start={range.start} end={range.end} />
      </div>

      <section className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <StatCard label="Appointments" value={String(data.appointments.total)} hint="Test drives requested" />
        <StatCard label="Inquiries" value={String(data.inquiries.total)} hint="Send Message submissions" />
        <StatCard label="Financing applications" value={String(data.financing.total)} hint="Apply for Financing submissions" />
        <StatCard label="Returning customers" value={String(data.returningCustomers.count)} hint="Logged-in, more than one submission" />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ReportSection
          title="Appointments over time"
          description="Test drive requests received, by day/week/month"
          exportSlot={
            <ExportCsvButton
              filename="appointments"
              headers={["Date", "Status", "Contact", "Email", "Vehicles"]}
              rows={data.appointments.rows.map((r) => [r.createdAt, APPOINTMENT_STATUS_LABELS[r.status] ?? r.status, r.contactName, r.contactEmail, r.vehicleTitles])}
            />
          }
        >
          {data.appointments.total > 0 ? (
            <TimeSeriesChart data={data.appointments.overTime} granularity={granularity} seriesLabel="Appointments" />
          ) : (
            <ReportEmptyState message="No appointments in this date range." />
          )}
        </ReportSection>

        <ReportSection title="Appointment status breakdown">
          {data.appointments.total > 0 ? (
            <StatusPieChart data={data.appointments.byStatus} labelMap={APPOINTMENT_STATUS_LABELS} />
          ) : (
            <ReportEmptyState message="No appointments in this date range." />
          )}
        </ReportSection>

        <ReportSection
          title="Inquiries over time"
          description="Send Message form submissions"
          exportSlot={
            <ExportCsvButton
              filename="inquiries"
              headers={["Date", "Status", "Contact", "Email", "Vehicle"]}
              rows={data.inquiries.rows.map((r) => [r.createdAt, r.status, r.contactName, r.contactEmail, r.vehicleTitles])}
            />
          }
        >
          {data.inquiries.total > 0 ? (
            <TimeSeriesChart data={data.inquiries.overTime} granularity={granularity} seriesLabel="Inquiries" />
          ) : (
            <ReportEmptyState message="No inquiries in this date range." />
          )}
        </ReportSection>

        <ReportSection
          title="Financing applications over time"
          exportSlot={
            <ExportCsvButton
              filename="financing-applications"
              headers={["Date", "Status", "Contact", "Email", "Vehicle"]}
              rows={data.financing.rows.map((r) => [r.createdAt, r.status, r.contactName, r.contactEmail, r.vehicleTitles])}
            />
          }
        >
          {data.financing.total > 0 ? (
            <TimeSeriesChart data={data.financing.overTime} granularity={granularity} seriesLabel="Applications" />
          ) : (
            <ReportEmptyState message="No financing applications in this date range." />
          )}
        </ReportSection>

        <ReportSection
          title="Top viewed vehicles"
          description="Unique visitors who viewed each listing at least once in this range"
          exportSlot={
            <ExportCsvButton filename="top-viewed-vehicles" headers={["Vehicle", "Unique views"]} rows={data.topVehicles.map((v) => [v.label, v.value])} />
          }
        >
          {data.topVehicles.length > 0 ? (
            <RankedBarChart data={data.topVehicles} valueLabel="Unique views" />
          ) : (
            <ReportEmptyState message="No vehicle views in this date range." />
          )}
        </ReportSection>

        <ReportSection title="Inventory by status" description="Every listing, regardless of date range">
          {data.vehicleStatusBreakdown.length > 0 ? (
            <StatusPieChart data={data.vehicleStatusBreakdown} />
          ) : (
            <ReportEmptyState message="No vehicles listed yet." />
          )}
        </ReportSection>
      </div>

      <ReportSection
        title="Returning customers"
        description="Logged-in customers with more than one appointment/inquiry/financing submission to your showroom in this range"
        exportSlot={
          <ExportCsvButton
            filename="returning-customers"
            headers={["Name", "Email", "Submissions"]}
            rows={data.returningCustomers.rows.map((r) => [r.name, r.email, r.interactionCount])}
          />
        }
      >
        {data.returningCustomers.rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-xs font-semibold text-neutral-500 uppercase">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2">Submissions</th>
                </tr>
              </thead>
              <tbody>
                {data.returningCustomers.rows.map((r) => (
                  <tr key={r.customerId} className="border-b border-neutral-100 last:border-b-0">
                    <td className="py-2 pr-4 text-neutral-800">{r.name}</td>
                    <td className="py-2 pr-4 text-neutral-500">{r.email}</td>
                    <td className="py-2 font-mono text-neutral-800">{r.interactionCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ReportEmptyState message="No repeat customers in this date range." />
        )}
      </ReportSection>
    </div>
  );
}
