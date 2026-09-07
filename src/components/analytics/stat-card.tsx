interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
}

/** Same visual pattern as the admin dashboard's existing stat tiles — reused here rather than duplicated. */
export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <p className="mt-2 font-mono text-2xl font-semibold text-neutral-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-neutral-400">{hint}</p>}
    </div>
  );
}
