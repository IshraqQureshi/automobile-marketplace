import type { ReactNode } from "react";

interface ReportSectionProps {
  title: string;
  description?: string;
  exportSlot?: ReactNode;
  children: ReactNode;
}

/** The card shell every chart/table report lives in — title/description on the left, an optional export button on the right. */
export function ReportSection({ title, description, exportSlot, children }: ReportSectionProps) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold text-neutral-900">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-neutral-500">{description}</p>}
        </div>
        {exportSlot}
      </div>
      {children}
    </section>
  );
}

/** A simple centered message for a report with no data in the selected range — never render an empty chart. */
export function ReportEmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-14 text-center">
      <p className="text-sm font-medium text-neutral-500">{message}</p>
    </div>
  );
}
