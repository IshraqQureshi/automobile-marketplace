"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { BucketGranularity } from "@/features/analytics/date-range";
import type { GroupCount, RankedItem, TimeSeriesPoint } from "@/features/analytics/aggregations";

// A small, deliberately non-huge categorical palette — reused across every
// chart on every report so "top vehicles" and "top showrooms" and "status
// breakdown" all read as one consistent visual system rather than each
// picking its own colors. Brand teal leads since it's this app's own
// accent; the rest are Tailwind's own 500-weight hues for legibility on
// white.
const CHART_PALETTE = ["#007f77", "#2563eb", "#d97706", "#7c3aed", "#dc2626", "#0891b2", "#65a30d", "#db2777"];

// Semantic colors for statuses that have a real good/bad meaning — kept
// separate from the rotating palette above, matching this app's existing
// badge color conventions (admin-ui.tsx's STATUS_BADGE_CLASSES) translated
// to hex for recharts' `fill`, which can't consume Tailwind classes.
const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "#16a34a",
  COMPLETED: "#16a34a",
  ACTIVE: "#16a34a",
  APPROVED: "#16a34a",
  PENDING: "#d97706",
  PENDING_REVIEW: "#d97706",
  NEW: "#2563eb",
  VIEWED: "#0891b2",
  DECLINED: "#dc2626",
  REJECTED: "#dc2626",
  CANCELLED: "#dc2626",
  SUSPENDED: "#dc2626",
  DRAFT: "#71717a",
  INACTIVE: "#71717a",
  SOLD: "#7c3aed",
  RESCHEDULED: "#7c3aed",
};

function formatBucketLabel(date: string, granularity: BucketGranularity): string {
  const d = new Date(`${date}T00:00:00`);
  if (granularity === "month") return d.toLocaleDateString("en-KE", { month: "short", year: "2-digit" });
  return d.toLocaleDateString("en-KE", { month: "short", day: "numeric" });
}

interface TimeSeriesChartProps {
  data: TimeSeriesPoint[];
  granularity: BucketGranularity;
  seriesLabel: string;
}

/** A line chart for "X over time" reports — appointments/inquiries/financing/signups per day-or-week-or-month. */
export function TimeSeriesChart({ data, granularity, seriesLabel }: TimeSeriesChartProps) {
  const chartData = data.map((p) => ({ ...p, label: formatBucketLabel(p.date, granularity) }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#e5e5e5" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#737373" }} axisLine={{ stroke: "#e5e5e5" }} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#737373" }} axisLine={false} tickLine={false} width={28} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e5e5" }} />
        <Line type="monotone" dataKey="count" name={seriesLabel} stroke="#007f77" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface RankedBarChartProps {
  data: RankedItem[];
  valueLabel: string;
}

/** A horizontal bar chart for "top N" reports — top viewed vehicles, top showrooms. */
export function RankedBarChart({ data, valueLabel }: RankedBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 42)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
        <CartesianGrid stroke="#e5e5e5" strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#737373" }} axisLine={{ stroke: "#e5e5e5" }} tickLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 12, fill: "#404040" }}
          axisLine={false}
          tickLine={false}
          width={140}
        />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e5e5" }} />
        <Bar dataKey="value" name={valueLabel} radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell key={entry.key} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface StatusPieChartProps {
  data: GroupCount[];
  // A plain lookup table, not a function — this component is "use client"
  // and a Server Component page can't pass it a function prop (React
  // Server Components can only pass serializable data across that
  // boundary), confirmed live: passing `labelFor={(g) => ...}` from a page
  // threw "Functions cannot be passed directly to Client Components."
  labelMap?: Record<string, string>;
}

/** A pie chart for a status/category breakdown — appointment statuses, vehicle statuses, showroom statuses. */
export function StatusPieChart({ data, labelMap }: StatusPieChartProps) {
  const chartData = data.map((d) => ({ ...d, label: labelMap?.[d.group] ?? d.group }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={chartData} dataKey="count" nameKey="label" cx="50%" cy="42%" outerRadius={75} isAnimationActive={false}>
          {chartData.map((entry, i) => (
            <Cell key={entry.group} fill={STATUS_COLORS[entry.group] ?? CHART_PALETTE[i % CHART_PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e5e5" }} />
        <Legend
          formatter={(value: string, entry: { payload?: { count?: number } }) => `${value} (${entry.payload?.count ?? 0})`}
          wrapperStyle={{ fontSize: 12 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
