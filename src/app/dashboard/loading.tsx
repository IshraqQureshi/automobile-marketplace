// Shown instantly while a page under /dashboard is loading — DashboardShell
// (rendered by layout.tsx, wrapping {children}) keeps its own sidebar/nav
// mounted and interactive, only the content area shows this. Same gap this
// fills as (site)/loading.tsx and admin/(protected)/loading.tsx: without a
// loading.tsx at this route group, clicking a dashboard nav link gave no
// feedback until the whole destination page's data fetch finished.
export default function DashboardLoading() {
  return (
    <div className="flex min-h-[60vh] flex-1 items-center justify-center lg:min-h-0" role="status" aria-label="Loading">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-brand" />
    </div>
  );
}
