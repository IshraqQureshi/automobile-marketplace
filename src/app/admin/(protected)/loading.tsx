// Shown instantly while a page under /admin is loading — the sidebar
// (rendered by (protected)/layout.tsx, a sibling of {children}) stays
// mounted and interactive, only the content column shows this. Same gap
// this fills as (site)/loading.tsx: without a loading.tsx at this route
// group, clicking an admin sidebar link gave no feedback until the whole
// destination page's data fetch finished.
export default function AdminLoading() {
  return (
    <div className="flex flex-1 items-center justify-center" role="status" aria-label="Loading">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-brand" />
    </div>
  );
}
