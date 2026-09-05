import { StatusBadge } from "@/components/admin/admin-ui";
import type { OwnerShowroom } from "@/features/showroom/my-showroom";

interface DashboardTopbarProps {
  title: string;
  showroom: OwnerShowroom;
}

// Mirrors AdminTopbar's title+date shell (src/components/admin/admin-topbar.tsx)
// for visual consistency between the two dashboards, but the right slot shows
// the showroom's real approval status instead of a "coming soon" search/bell —
// there's nothing to search yet on this side, and a real status badge is more
// useful here than a placeholder.
export function DashboardTopbar({ title, showroom }: DashboardTopbarProps) {
  const today = new Intl.DateTimeFormat("en-KE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <header className="flex items-center gap-4 border-b border-neutral-200 bg-white px-7 py-4">
      <div>
        <h1 className="font-display text-lg font-semibold text-neutral-900">{title}</h1>
        <p className="text-xs text-neutral-500">{today}</p>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs font-medium text-neutral-400">Showroom status</span>
        <StatusBadge status={showroom.status} />
      </div>
    </header>
  );
}
