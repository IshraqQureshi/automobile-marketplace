"use client";

import { useEffect } from "react";

/**
 * The spinner + top progress bar shown by every loading.tsx Suspense
 * boundary in the app (root, (site), dashboard, admin) — mounted the
 * instant a navigation starts and unmounted the instant the destination
 * page is ready, so no router-event listener is needed to know when
 * "loading" is true.
 *
 * Real bug this fixes (client-reported): Header/Footer stay mounted
 * outside this boundary, so clicking a link low on a long page (e.g. a
 * footer link) left the scroll position wherever it already was while the
 * {children} slot collapsed to a short fallback — stranding the user on
 * the footer with no obvious loading feedback, and the page never
 * re-scrolled once the destination mounted at that same clamped offset.
 * Resetting scroll the instant this mounts fixes both halves: the fixed
 * top bar is visible immediately regardless of prior scroll position, and
 * the destination page always starts at the top.
 */
export function RouteLoadingIndicator() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-brand/15" role="status" aria-label="Loading">
        <div className="h-full w-1/3 animate-route-progress bg-brand" />
      </div>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-brand" aria-hidden="true" />
    </>
  );
}
