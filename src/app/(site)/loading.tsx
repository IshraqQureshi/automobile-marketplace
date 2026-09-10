// Next.js shows this instantly on any navigation between pages under the
// (site) route group (Header/Footer stay mounted — this only replaces the
// page content slot in between them) while the destination page's own data
// fetch is in flight. The root src/app/loading.tsx only covers the very
// first page load; navigating from one (site) page to another re-uses the
// already-mounted root layout, so without a loading.tsx at this level
// there was no loading feedback at all for a click that hadn't finished
// yet — same "instant loading state" mechanism as every other loading.tsx
// in this app, just scoped to this route group.
export default function SiteLoading() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Loading">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-brand" />
    </main>
  );
}
