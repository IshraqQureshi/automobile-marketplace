import type { Metadata } from "next";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { RankedBarChart, StatusPieChart, TimeSeriesChart } from "@/components/analytics/charts";
import { DateRangeForm } from "@/components/analytics/date-range-form";
import { ExportCsvButton } from "@/components/analytics/export-csv-button";
import { ReportEmptyState, ReportSection } from "@/components/analytics/report-section";
import { StatCard } from "@/components/analytics/stat-card";
import { getAdminReportData } from "@/features/analytics/admin-report-queries";
import { isValidDateOnly, pickGranularity, resolveDateRange, type DateRangePreset } from "@/features/analytics/date-range";
import { currencyFormatter } from "@/features/vehicle/types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Reports — HarakaGari Admin",
};

interface AdminReportsPageProps {
  searchParams: Promise<{ range?: string; start?: string; end?: string }>;
}

const VALID_PRESETS = new Set(["7d", "30d", "90d", "custom"]);

function isPreset(value: string | undefined): value is DateRangePreset {
  return !!value && VALID_PRESETS.has(value);
}

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export default async function AdminReportsPage({ searchParams }: AdminReportsPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const preset: DateRangePreset = isPreset(params.range) ? params.range : "30d";
  const range = resolveDateRange(preset, {
    start: isValidDateOnly(params.start) ? params.start : undefined,
    end: isValidDateOnly(params.end) ? params.end : undefined,
  });
  const granularity = pickGranularity(range);

  const data = await getAdminReportData(supabase, range, granularity);
  const totalShowrooms = data.showroomStatusBreakdown.reduce((sum, g) => sum + g.count, 0);

  return (
    <>
      <AdminTopbar title="Reports" />
      <main className="flex-1 px-7 py-6">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-neutral-500">Platform-wide analytics for {range.start} to {range.end}</p>
            <DateRangeForm action="/admin/reports" preset={preset} start={range.start} end={range.end} />
          </div>

          <section className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Showrooms" value={String(totalShowrooms)} hint="All statuses" />
            <StatCard
              label="Appointments"
              value={String(data.appointmentsOverTime.reduce((s, p) => s + p.count, 0))}
              hint="Test drives requested"
            />
            <StatCard label="Inquiries" value={String(data.inquiriesOverTime.reduce((s, p) => s + p.count, 0))} hint="Send Message submissions" />
            <StatCard
              label="Financing applications"
              value={String(data.financingOverTime.reduce((s, p) => s + p.count, 0))}
              hint="Apply for Financing submissions"
            />
            <StatCard
              label="Subscription revenue"
              value={currencyFormatter.format(data.subscriptionRevenue.total)}
              hint="Recorded manual payments"
            />
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ReportSection title="Showroom status breakdown" description="Progress through approval — pending, approved, rejected, suspended">
              {totalShowrooms > 0 ? (
                <StatusPieChart
                  data={data.showroomStatusBreakdown}
                  labelMap={Object.fromEntries(data.showroomStatusBreakdown.map((g) => [g.group, titleCase(g.group)]))}
                />
              ) : (
                <ReportEmptyState message="No showrooms yet." />
              )}
            </ReportSection>

            <ReportSection title="Showroom signups over time">
              {totalShowrooms > 0 ? (
                <TimeSeriesChart data={data.showroomSignupsOverTime} granularity={granularity} seriesLabel="New showrooms" />
              ) : (
                <ReportEmptyState message="No showrooms in this date range." />
              )}
            </ReportSection>

            <ReportSection title="Appointments over time" description="Platform-wide test drive requests">
              <TimeSeriesChart data={data.appointmentsOverTime} granularity={granularity} seriesLabel="Appointments" />
            </ReportSection>

            <ReportSection title="Inquiries over time" description="Platform-wide Send Message submissions">
              <TimeSeriesChart data={data.inquiriesOverTime} granularity={granularity} seriesLabel="Inquiries" />
            </ReportSection>

            <ReportSection title="Financing applications over time" description="Platform-wide Apply for Financing submissions">
              <TimeSeriesChart data={data.financingOverTime} granularity={granularity} seriesLabel="Applications" />
            </ReportSection>

            <ReportSection title="User signups over time" description="Every registered profile — customers and showroom owners">
              <TimeSeriesChart data={data.userSignupsOverTime} granularity={granularity} seriesLabel="New users" />
            </ReportSection>

            <ReportSection
              title="Top viewed vehicles"
              description="Unique visitors, platform-wide, in this range"
              exportSlot={
                <ExportCsvButton filename="top-viewed-vehicles" headers={["Vehicle", "Unique views"]} rows={data.topVehicles.map((v) => [v.label, v.value])} />
              }
            >
              {data.topVehicles.length > 0 ? <RankedBarChart data={data.topVehicles} valueLabel="Unique views" /> : <ReportEmptyState message="No vehicle views in this date range." />}
            </ReportSection>

            <ReportSection
              title="Top showrooms"
              description="By combined engagement — views + inquiries + appointments + financing applications"
              exportSlot={
                <ExportCsvButton filename="top-showrooms" headers={["Showroom", "Total engagement"]} rows={data.topShowrooms.map((s) => [s.label, s.value])} />
              }
            >
              {data.topShowrooms.length > 0 ? <RankedBarChart data={data.topShowrooms} valueLabel="Total engagement" /> : <ReportEmptyState message="No showroom activity in this date range." />}
            </ReportSection>
          </div>

          <ReportSection
            title="How each showroom is working"
            description="Per-showroom breakdown — vehicles listed, unique views, inquiries, appointments, and financing applications in this range"
            exportSlot={
              <ExportCsvButton
                filename="showroom-scorecards"
                headers={["Showroom", "Status", "Active vehicles", "Unique views", "Inquiries", "Appointments", "Financing applications", "Total engagement"]}
                rows={data.showroomScorecards.map((s) => [
                  s.showroomName,
                  titleCase(s.status),
                  s.vehicleCount,
                  s.uniqueViews,
                  s.inquiries,
                  s.appointments,
                  s.financingApplications,
                  s.totalEngagement,
                ])}
              />
            }
          >
            {data.showroomScorecards.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-xs font-semibold text-neutral-500 uppercase">
                      <th className="py-2 pr-4">Showroom</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4 text-right">Vehicles</th>
                      <th className="py-2 pr-4 text-right">Views</th>
                      <th className="py-2 pr-4 text-right">Inquiries</th>
                      <th className="py-2 pr-4 text-right">Appointments</th>
                      <th className="py-2 pr-4 text-right">Financing</th>
                      <th className="py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.showroomScorecards.map((s) => (
                      <tr key={s.showroomId} className="border-b border-neutral-100 last:border-b-0">
                        <td className="py-2 pr-4 font-medium text-neutral-800">{s.showroomName}</td>
                        <td className="py-2 pr-4 text-neutral-500">{titleCase(s.status)}</td>
                        <td className="py-2 pr-4 text-right font-mono text-neutral-800">{s.vehicleCount}</td>
                        <td className="py-2 pr-4 text-right font-mono text-neutral-800">{s.uniqueViews}</td>
                        <td className="py-2 pr-4 text-right font-mono text-neutral-800">{s.inquiries}</td>
                        <td className="py-2 pr-4 text-right font-mono text-neutral-800">{s.appointments}</td>
                        <td className="py-2 pr-4 text-right font-mono text-neutral-800">{s.financingApplications}</td>
                        <td className="py-2 text-right font-mono font-semibold text-neutral-900">{s.totalEngagement}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <ReportEmptyState message="No showrooms yet." />
            )}
          </ReportSection>
        </div>
      </main>
    </>
  );
}
