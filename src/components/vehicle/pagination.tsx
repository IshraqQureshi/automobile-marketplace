import Link from "next/link";
import { buildPageNumbers } from "@/features/vehicle/pagination-utils";
import type { VehicleSearchFilters } from "@/features/vehicle/search";
import { vehicleSearchFiltersToParams } from "@/features/vehicle/search";

interface PaginationProps {
  filters: VehicleSearchFilters;
  totalCount: number;
  perPage: number;
  basePath: string;
}

// First-generation pagination for this project (no existing pattern to
// reuse — every other list is fetched in one shot and filtered client-side
// at admin/dashboard scale; the public marketplace can't assume that stays
// small). Plain page-number links (page is just another searchParam) rather
// than client-side state, so pages are directly shareable/bookmarkable and
// work without JS.
export function Pagination({ filters, totalCount, perPage, basePath }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  if (totalPages <= 1) return null;

  function hrefForPage(page: number) {
    const params = vehicleSearchFiltersToParams({ ...filters, page });
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  }

  const current = Math.min(filters.page, totalPages);
  const pageNumbers = buildPageNumbers(current, totalPages);

  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1.5">
      <PageLink href={hrefForPage(current - 1)} disabled={current <= 1} label="Previous page">
        ←
      </PageLink>

      {pageNumbers.map((page, index) =>
        page === "…" ? (
          <span key={`ellipsis-${index}`} className="px-2 text-sm text-neutral-400">
            …
          </span>
        ) : (
          <PageLink key={page} href={hrefForPage(page)} active={page === current} label={`Page ${page}`}>
            {page}
          </PageLink>
        ),
      )}

      <PageLink href={hrefForPage(current + 1)} disabled={current >= totalPages} label="Next page">
        →
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  children,
  active,
  disabled,
  label,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  label: string;
}) {
  if (disabled) {
    return (
      <span aria-label={label} aria-disabled="true" className="flex h-9 w-9 items-center justify-center rounded-md text-sm text-neutral-300">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "flex h-9 w-9 items-center justify-center rounded-md bg-brand text-sm font-semibold text-white no-underline"
          : "flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium text-neutral-600 no-underline hover:bg-neutral-100"
      }
    >
      {children}
    </Link>
  );
}
