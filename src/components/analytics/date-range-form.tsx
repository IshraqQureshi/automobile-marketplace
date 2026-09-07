"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { DateRangePreset } from "@/features/analytics/date-range";

interface DateRangeFormProps {
  action: string;
  preset: DateRangePreset;
  start: string;
  end: string;
}

const PRESET_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "custom", label: "Custom range" },
];

const inputClassName =
  "rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700 outline-none focus:border-brand focus:ring-1 focus:ring-brand";

/**
 * The date-range filter for every report page — a "use client" component
 * (same precedent as VehicleSortSelect) so the preset select can apply
 * immediately on change, while every OTHER filter on a report page (e.g. an
 * admin report's showroom picker) stays a plain server-rendered GET form.
 * Reads/writes the URL's own `range`/`start`/`end` params directly rather
 * than lifting state, so a report page's data-fetching stays entirely
 * server-side (read searchParams, resolve the range, query) — no client/
 * server round-trip beyond the navigation itself.
 */
export function DateRangeForm({ action, preset, start, end }: DateRangeFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handlePresetChange(next: DateRangePreset) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", next);
    router.push(`${action}?${params.toString()}`);
  }

  function handleCustomSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const nextStart = (form.elements.namedItem("start") as HTMLInputElement).value;
    const nextEnd = (form.elements.namedItem("end") as HTMLInputElement).value;
    // A cleared date input submits as "" (not omitted), which the page's
    // resolveDateRange call can't tell apart from "no override" via `??` —
    // code review caught this producing a silently empty/malformed range
    // rather than a validation error. Keep the field's own existing value
    // (still visible in the input, just not yet actually applied) instead
    // of navigating with a blank date.
    if (!nextStart || !nextEnd) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", "custom");
    params.set("start", nextStart);
    params.set("end", nextEnd);
    router.push(`${action}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="report-range" className="mb-1 block text-xs font-semibold text-neutral-500 uppercase">
          Date range
        </label>
        <select
          id="report-range"
          value={preset}
          onChange={(e) => handlePresetChange(e.target.value as DateRangePreset)}
          className={inputClassName}
        >
          {PRESET_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {preset === "custom" && (
        <form onSubmit={handleCustomSubmit} className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="report-start" className="mb-1 block text-xs font-semibold text-neutral-500 uppercase">
              From
            </label>
            <input id="report-start" type="date" name="start" defaultValue={start} className={inputClassName} />
          </div>
          <div>
            <label htmlFor="report-end" className="mb-1 block text-xs font-semibold text-neutral-500 uppercase">
              To
            </label>
            <input id="report-end" type="date" name="end" defaultValue={end} className={inputClassName} />
          </div>
          <button type="submit" className="rounded-md border border-neutral-300 px-3.5 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            Apply
          </button>
        </form>
      )}
    </div>
  );
}
